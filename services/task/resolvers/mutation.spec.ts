import { TaskStatus } from '../../../generated/types'
import { MockContext, Context, createMockContext } from '../../../mockContext'
import { mutation } from './mutation'

describe('Task Mutation Resolvers', () => {
  let mockCtx: MockContext
  let ctx: Context

  beforeEach(() => {
    mockCtx = createMockContext()
    ctx = mockCtx as unknown as Context
  })

  it('creates a new list correctly', async () => {
    const input = {
      title: 'test',
    }

    const mockedList = {
      id: '1',
      title: 'test',
      tasks: [],
    }

    mockCtx.prisma.list.create.mockResolvedValue(mockedList)

    await expect(
      (mutation!.createList as Function)({}, { input }, ctx)
    ).resolves.toEqual(mockedList)

    expect(mockCtx.prisma.list.create).toHaveBeenCalledWith({
      data: input,
      include: { tasks: { orderBy: { priority: 'desc' } } },
    })
  })

  describe('updateTask', () => {
    it('updates task correctly', async () => {
      const input = {
        title: 'test',
        status: TaskStatus.Completed,
      }

      const mockedTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Completed,
        priority: 1,
        listId: '1',
      }

      mockCtx.prisma.task.update.mockResolvedValue(mockedTask)

      await expect(
        (mutation!.updateTask as Function)(
          {},
          { id: mockedTask.id, input },
          ctx
        )
      ).resolves.toEqual(mockedTask)

      expect(mockCtx.prisma.task.update).toHaveBeenCalledWith({
        where: { id: mockedTask.id },
        data: input,
      })
    })

    it('omits null title field', async () => {
      const input = {
        title: null,
        status: TaskStatus.Completed,
      }

      const mockedTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Completed,
        priority: 1,
        listId: '1',
      }

      mockCtx.prisma.task.update.mockResolvedValue(mockedTask)

      await expect(
        (mutation!.updateTask as Function)(
          {},
          { id: mockedTask.id, input },
          ctx
        )
      ).resolves.toEqual(mockedTask)

      expect(mockCtx.prisma.task.update).toHaveBeenCalledWith({
        where: { id: mockedTask.id },
        data: { status: TaskStatus.Completed },
      })
    })

    it('omits null status field', async () => {
      const input = {
        title: 'test',
        status: null,
      }

      const mockedTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Completed,
        priority: 1,
        listId: '1',
      }

      mockCtx.prisma.task.update.mockResolvedValue(mockedTask)

      await expect(
        (mutation!.updateTask as Function)(
          {},
          { id: mockedTask.id, input },
          ctx
        )
      ).resolves.toEqual(mockedTask)

      expect(mockCtx.prisma.task.update).toHaveBeenCalledWith({
        where: { id: mockedTask.id },
        data: { title: 'test' },
      })
    })
  })

  describe('createTask', () => {
    it('creates a new task correctly', async () => {
      const input = {
        title: 'test',
        listId: '1',
      }

      const mockedTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 1,
        listId: '1',
      }

      const tx = {
        task: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockedTask),
        },
      }

      ctx.prisma.$transaction = jest.fn().mockImplementation(cb => cb(tx))

      await expect(
        (mutation!.createTask as Function)({}, { input }, ctx)
      ).resolves.toEqual(mockedTask)

      expect(tx.task.findFirst).toHaveBeenCalledWith({
        where: { listId: input.listId },
        orderBy: { priority: 'desc' },
      })

      expect(tx.task.create).toHaveBeenCalledWith({
        data: { ...input, status: TaskStatus.Pending, priority: 1 },
        include: {
          list: { include: { tasks: { orderBy: { priority: 'desc' } } } },
        },
      })
    })

    it('creates a new task with correct priority', async () => {
      const input = {
        title: 'test',
        listId: '1',
      }

      const highestPriorityTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 1,
        listId: '1',
      }

      const mockedTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 2,
        listId: '1',
      }

      const tx = {
        task: {
          findFirst: jest.fn().mockResolvedValue(highestPriorityTask),
          create: jest.fn().mockResolvedValue(mockedTask),
        },
      }

      ctx.prisma.$transaction = jest.fn().mockImplementation(cb => cb(tx))

      await expect(
        (mutation!.createTask as Function)({}, { input }, ctx)
      ).resolves.toEqual(mockedTask)

      expect(tx.task.findFirst).toHaveBeenCalledWith({
        where: { listId: input.listId },
        orderBy: { priority: 'desc' },
      })

      expect(tx.task.create).toHaveBeenCalledWith({
        data: { ...input, status: TaskStatus.Pending, priority: 2 },
        include: {
          list: { include: { tasks: { orderBy: { priority: 'desc' } } } },
        },
      })
    })
  })

  describe('moveTask', () => {
    it('moves a task to before a given id', async () => {
      const input = {
        beforeId: '1',
      }

      const mockedTargetTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 2,
        listId: '1',
      }

      const mockedTask = {
        id: '2',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 3,
        listId: '1',
      }

      const expectedTask = {
        ...mockedTask,
        priority: 2,
      }

      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue(mockedTargetTask),
          updateMany: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(expectedTask),
        },
      }

      ctx.prisma.$transaction = jest.fn().mockImplementation(cb => cb(tx))

      await expect(
        (mutation!.moveTask as Function)({}, { id: mockedTask.id, input }, ctx)
      ).resolves.toEqual(expectedTask)

      expect(tx.task.findUnique).toHaveBeenCalledWith({
        where: { id: mockedTargetTask.id },
      })

      expect(tx.task.updateMany).toHaveBeenCalledWith({
        where: {
          listId: mockedTargetTask.listId,
          priority: { gte: mockedTargetTask.priority },
        },
        data: { priority: { increment: 1 } },
      })

      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: mockedTask.id },
        data: { priority: expectedTask.priority },
        include: {
          list: { include: { tasks: { orderBy: { priority: 'desc' } } } },
        },
      })
    })

    it('moves a task to after a given id', async () => {
      const input = {
        afterId: '1',
      }

      const mockedTargetTask = {
        id: '1',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 3,
        listId: '1',
      }

      const mockedTask = {
        id: '2',
        title: 'test',
        status: TaskStatus.Pending,
        priority: 2,
        listId: '1',
      }

      const expectedTask = {
        ...mockedTask,
        priority: 3,
      }

      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue(mockedTargetTask),
          updateMany: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(expectedTask),
        },
      }

      ctx.prisma.$transaction = jest.fn().mockImplementation(cb => cb(tx))

      await expect(
        (mutation!.moveTask as Function)({}, { id: mockedTask.id, input }, ctx)
      ).resolves.toEqual(expectedTask)

      expect(tx.task.findUnique).toHaveBeenCalledWith({
        where: { id: mockedTargetTask.id },
      })

      expect(tx.task.updateMany).toHaveBeenCalledWith({
        where: {
          listId: mockedTargetTask.listId,
          priority: { lte: mockedTargetTask.priority - 1 },
        },
        data: { priority: { decrement: 1 } },
      })

      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: mockedTask.id },
        data: { priority: expectedTask.priority },
        include: {
          list: { include: { tasks: { orderBy: { priority: 'desc' } } } },
        },
      })
    })

    it('throws an error when beforeId and afterId exist at the same time', async () => {
      const input = {
        afterId: '1',
        beforeId: '2',
      }

      await expect(
        (mutation!.moveTask as Function)({}, { id: '2', input }, ctx)
      ).rejects.toThrow()
    })

    it('throws an error when missing beforeId and afterId', async () => {
      const input = {}

      await expect(
        (mutation!.moveTask as Function)({}, { id: '2', input }, ctx)
      ).rejects.toThrow()
    })

    it('throws an error when beforeId or afterId is in correct', async () => {
      const input = {
        afterId: '1',
      }

      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }

      ctx.prisma.$transaction = jest.fn().mockImplementation(cb => cb(tx))

      await expect(
        (mutation!.moveTask as Function)({}, { id: '2', input }, ctx)
      ).rejects.toThrow()
    })
  })
})
