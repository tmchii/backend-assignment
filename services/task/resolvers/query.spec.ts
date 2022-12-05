import { MockContext, Context, createMockContext } from '../../../mockContext'
import { query } from './query'

describe('Task Query Resolvers', () => {
  let mockCtx: MockContext
  let ctx: Context

  beforeEach(() => {
    mockCtx = createMockContext()
    ctx = mockCtx as unknown as Context
  })

  it('gets lists with correct priority', async () => {
    const mockedLists = [
      {
        id: '1',
        title: 'test',
        tasks: [
          {
            id: '7',
            title: 'test',
            status: 'PENDING',
            priority: 20,
            listId: '1',
          },
          {
            id: '6',
            title: 'test',
            status: 'PENDING',
            priority: 17,
            listId: '1',
          },
        ],
      },
    ]

    mockCtx.prisma.list.findMany.mockResolvedValue(mockedLists)

    await expect((query!.lists as Function)({}, {}, ctx)).resolves.toEqual(
      mockedLists
    )

    expect(mockCtx.prisma.list.findMany).toHaveBeenCalledWith({
      include: { tasks: { orderBy: { priority: 'desc' } } },
    })
  })
})
