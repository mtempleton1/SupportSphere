import { describe, it, expect, jest } from '@jest/globals';
import { OttoSystem } from '../../../src/otto/core/system';
import { CurrentTimeTool } from '../../../src/otto/core/tools/currentTime';
import { ToolRegistry } from '../../../src/otto/core/tools/registry';
// import { z } from 'zod';
// Increase timeout for tests making real API calls
jest.setTimeout(30000); // 30 seconds
describe('Otto Tools', () => {
    const createTestConfig = () => ({
        openAiKey: process.env.VITE_OPENAI_API_KEY || 'test-key',
        userProfile: {
            userId: 'test-user',
            accountId: 'test-account',
            userType: 'staff',
            roleId: 'admin'
        }
    });
    describe('CurrentTimeTool', () => {
        it('should return time in 24h format by default', async () => {
            const tool = new CurrentTimeTool();
            const result = await tool.execute({});
            // Should match format like "14:30"
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });
        it('should return time in 12h format when specified', async () => {
            const tool = new CurrentTimeTool();
            const result = await tool.execute({ format: '12h' });
            // Should match format like "2:30 PM"
            expect(result).toMatch(/^\d{1,2}:\d{2} [AP]M$/);
        });
    });
    describe('Tool Integration', () => {
        it('should process a query using the current time tool', async () => {
            const config = createTestConfig();
            const otto = new OttoSystem(config);
            const response = await otto.processQuery('What time is it?');
            // The response should include both the user's question and Otto's response
            expect(response.messages).toHaveLength(2);
            expect(response.messages[0]).toEqual({
                role: 'user',
                content: 'What time is it?',
                timestamp: expect.any(String)
            });
            expect(response.messages[1]).toHaveProperty('role', 'assistant');
            // The response should mention the time
            const assistantMessage = response.messages[1].content;
            expect(typeof assistantMessage).toBe('string');
            expect(assistantMessage.toLowerCase()).toMatch(/time|clock|\d{1,2}:\d{2}/);
        });
        it('should handle tool execution errors gracefully', async () => {
            const config = createTestConfig();
            const otto = new OttoSystem(config);
            // Create a failing tool for testing
            const failingTool = new CurrentTimeTool();
            const mockExecute = jest.fn()
                .mockRejectedValue(new Error('Time service unavailable'));
            failingTool.execute = mockExecute;
            // Replace the tool registry with our failing tool
            otto.tools = new ToolRegistry();
            otto.tools.registerTool(failingTool);
            const response = await otto.processQuery('What time is it?');
            // Should still get a response, even if tool failed
            expect(response.messages.length).toBeGreaterThan(1);
            expect(response.messages[response.messages.length - 1].role).toBe('assistant');
        });
    });
});
