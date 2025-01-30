from typing import TypedDict, Sequence, Dict
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import Graph
from langgraph.checkpoint.memory import MemorySaver

# Define our state type
class AgentState(TypedDict):
    messages: Sequence[BaseMessage]
    pending_sends: list
    id: str  # Add id field to state type

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

def invoke_chain(query: str, thread_id: str) -> Dict:
    """
    Invoke the chain with the given query and thread ID.
    """
    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": "default",
        },
        "id": thread_id,
    }
    
    # Get the checkpoint for this thread
    checkpoint = memory.get(config)
    if checkpoint is None:
        # Initialize state if no checkpoint exists
        checkpoint = {
            "messages": [],
            "pending_sends": [],
            "id": thread_id,  # Include id in the state
        }
    
    # Add the user's message to the state as a HumanMessage
    checkpoint["messages"].append(HumanMessage(content=query))
    
    # Run the chain
    result = graph.invoke(checkpoint, config=config)
    
    # Ensure id is preserved in the result
    result["id"] = thread_id
    
    # Save the updated state
    memory.put(config, result, {}, {})
    
    # Convert the result to the format expected by the frontend
    return {
        "data": {
            "messages": [
                {
                    "role": "user" if isinstance(msg, HumanMessage) else "assistant",
                    "content": msg.content
                }
                for msg in result["messages"]
            ]
        },
        "error": None
    } 