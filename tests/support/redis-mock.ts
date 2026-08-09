import { vi } from 'vitest';

export const redisMock = {
    evalMock: vi.fn(),
    zremMock: vi.fn(),
    getMock: vi.fn(),
    setMock: vi.fn(),
    delMock: vi.fn(),
    hgetallMock: vi.fn(),
    hincrbyMock: vi.fn(),
    hincrbyfloatMock: vi.fn(),
    expireMock: vi.fn(),
};

export const redisStub = {
    eval: redisMock.evalMock,
    zrem: redisMock.zremMock,
    get: redisMock.getMock,
    set: redisMock.setMock,
    del: redisMock.delMock,
    hgetall: redisMock.hgetallMock,
    hincrby: redisMock.hincrbyMock,
    hincrbyfloat: redisMock.hincrbyfloatMock,
    expire: redisMock.expireMock,
};

export function resetRedisMock() {
    for (const fn of Object.values(redisMock)) fn.mockReset();

    redisMock.evalMock.mockImplementation(async (_script: string, keys: string[]) =>
        keys[0]?.startsWith('cc:') ? 1 : [1, 99, 0]);
    redisMock.zremMock.mockResolvedValue(1);
    redisMock.getMock.mockResolvedValue(null);
    redisMock.setMock.mockResolvedValue('OK');
    redisMock.delMock.mockResolvedValue(1);
    redisMock.hgetallMock.mockResolvedValue({});
    redisMock.hincrbyMock.mockResolvedValue(1);
    redisMock.hincrbyfloatMock.mockResolvedValue(1);
    redisMock.expireMock.mockResolvedValue(1);
}
