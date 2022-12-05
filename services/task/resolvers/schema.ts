import { gql } from 'apollo-server'

export const typeDefs = gql`
  enum TaskStatus {
    COMPLETED
    PENDING
  }

  type List {
    id: ID!
    title: String!
    tasks: [Task!]!
  }

  type Task {
    id: ID!
    title: String!
    status: TaskStatus!
    list: List
    listId: ID!
    priority: Int!
  }

  input CreateListInput {
    title: String!
  }

  input CreateTaskInput {
    title: String!
    listId: ID!
  }

  input UpdateTaskInput {
    title: String
    status: TaskStatus
  }

  input MoveTaskInput {
    beforeId: ID
    afterId: ID
  }

  type Query {
    lists: [List!]!
  }

  type Mutation {
    createList(input: CreateListInput!): List!
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    moveTask(id: ID!, input: MoveTaskInput!): Task!
  }
`
