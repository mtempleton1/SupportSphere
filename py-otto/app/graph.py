from typing import TypedDict, Sequence
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import Graph
from langgraph.checkpoint.memory import MemorySaver
import uuid

# Define our state type
class AgentState(TypedDict):
    messages: Sequence[BaseMessage]
    pending_sends: list
    id: str  # Added id field

def hello_world_response(state: AgentState) -> AgentState:
    """Generate a simple hello world response."""
    # Get the last message
    last_message = state["messages"][-1]
    
    # Create a simple response
    response = f"Hello! You said: {last_message.content}"
    
    # Add AI message to state
    state["messages"].append(AIMessage(content=response))
    return state

# Create the graph
workflow = Graph()

# Add node to the graph
workflow.add_node("respond", hello_world_response)

# Set entry and finish points
workflow.set_entry_point("respond")
workflow.set_finish_point("respond")

# Compile the graph
graph = workflow.compile()

# Create a memory saver for persistence
memory = MemorySaver()

def invoke_chain(message: str, thread_id: str = "default"):
    """Helper function to invoke the chain with a new message."""
    # Initialize config with thread_id and checkpoint namespace
    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": "default",  # Using 'default' namespace for our simple chat
        }
    }
    
    # Get existing state or create new one
    checkpoint = memory.get_tuple(config)
    state = checkpoint.checkpoint if checkpoint else {
        "messages": [HumanMessage(content=message)],
        "pending_sends": [],
        "id": str(uuid.uuid4())  # Generate a unique ID for the checkpoint
    }
    
    # Run the chain
    result = graph.invoke(state, config=config)
    
    # Ensure result has an ID (in case the graph execution didn't preserve it)
    if "id" not in result:
        result["id"] = str(uuid.uuid4())
    
    # Save state
    memory.put(config, result, {}, {})
    
    return {
        "messages": [
            {
                "role": msg.type,
                "content": msg.content
            }
            for msg in result["messages"]
        ]
    } 