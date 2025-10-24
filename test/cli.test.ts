import { describe, expect, it, vi } from 'vitest';

describe('CLI', () => {
  it('should handle server startup error', async () => {
    // Mock runServer to throw error
    vi.doMock('../lib/server.js', () => ({
      runServer: vi.fn().mockRejectedValue(new Error('Test error')),
    }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Import CLI after mocking
    await import('../cli/index.js');

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(consoleSpy).toHaveBeenCalledWith('Server error:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
    vi.clearAllMocks();
  });
});
