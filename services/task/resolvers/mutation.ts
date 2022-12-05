import { GraphQLError } from 'graphql'
import { omitBy, isNil } from 'lodash'
import { Resolvers, TaskStatus } from '../../../generated/types'
import { Context } from '../../../libs/context'

export const mutation: Resolvers<Context>['Mutation'] = {
  createList: async (_parent, { input }, ctx) =>
    ctx.prisma.list.create({
      data: input,
      include: { tasks: { orderBy: { priority: 'desc' } } },
    }),
  createTask: async (_parent, { input }, ctx) =>
    ctx.prisma.$transaction(async tx => {
      const highestPriorityTask = await tx.task.findFirst({
        where: { listId: input.listId },
        orderBy: { priority: 'desc' },
      })
      const priority = (highestPriorityTask?.priority || 0) + 1

      return tx.task.create({
        data: { ...input, status: TaskStatus.Pending, priority },
        include: {
          list: { include: { tasks: { orderBy: { priority: 'desc' } } } },
        },
      })
    }),
  updateTask: async (_parent, { id, input }, ctx) =>
    ctx.prisma.task.update({ where: { id }, data: omitBy(input, isNil) }),
  moveTask: async (_parent, { id, input }, ctx) => {
    const { beforeId, afterId } = input

    if (beforeId && afterId) {
      throw new GraphQLError(
        'beforeId and afterId need to be input one at a time'
      )
    }

    if (!beforeId && !afterId) {
      throw new GraphQLError('missing beforeId or afterId')
    }

    return ctx.prisma.$transaction(async tx => {
      const targetTask = await tx.task.findUnique({
        where: { id: beforeId ?? afterId ?? undefined },
      })

      if (!targetTask) {
        throw new GraphQLError('incorrect beforeId or afterId')
      }

      const { listId, priority } = targetTask ?? {}

      if (beforeId) {
        await tx.task.updateMany({
          where: { listId, priority: { gte: priority } },
          data: { priority: { increment: 1 } },
        })
      }

      if (afterId) {
        await tx.task.updateMany({
          where: { listId, priority: { lte: priority - 1 } },
          data: { priority: { decrement: 1 } },
        })
      }

      return tx.task.update({
        where: { id },
        data: { priority },
        include: {
          list: { include: { tasks: { orderBy: { priority: 'desc' } } } },
        },
      })
    })
  },
}
