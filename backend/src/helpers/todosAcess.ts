import * as AWS from 'aws-sdk'
const AWSXRay = require('aws-xray-sdk')
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate';

const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('TodosAccess')

export class TodoAccess {

    constructor(
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOS_TABLE,
    ) {
    }

    async getTodosForUser(userId: string): Promise<TodoItem[]> {
        try {
            logger.info('Getting all todos for user')

            const result = await this.docClient.query({
                TableName: this.todosTable,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                },
            }).promise()

            const items = result.Items
            return items as TodoItem[]
        } catch (error) {
            logger.error("Error getting todos for user", { error, userId })
            throw new Error("Error getting todos for user")
        }
    }

    async createTodo(todo: TodoItem): Promise<TodoItem> {
        try {
            logger.info("Creating todo", { todo })
            await this.docClient.put({
                TableName: this.todosTable,
                Item: todo
            }).promise()

            return todo
        } catch (error) {
            logger.error("Error creating todo", { error, todo })
            throw new Error("Error creating todo")
        }

    }

    async updateTodo(userId: string, todoId: string, todoUpdate: TodoUpdate) {

        try {
            logger.info("Updating Todo", todoId)
            await this.docClient.update({
                TableName: this.todosTable,
                Key: {
                    'userId': userId,
                    'todoId': todoId
                },
                UpdateExpression: "set #todoName= :val1, dueDate=:val2, #todoDone=:val3",
                ExpressionAttributeNames: {
                    "#todoName": "name",
                    "#todoDone": "done",
                },
                ExpressionAttributeValues: {
                    ":val1": todoUpdate.name,
                    ":val2": todoUpdate.dueDate,
                    ":val3": todoUpdate.done
                },
                ReturnValues: "UPDATED_NEW"
            }).promise()
        } catch (error) {
            logger.error("Error updating todo", { error, todoId })
            throw new Error("Error updating todo")
        }
    }

    async deleteTodo(userId: string, todoId: string) {
        try {
            logger.info("Deleting Todo", todoId)

            await this.docClient.delete({
                TableName: this.todosTable,
                Key: {
                    'userId': userId,
                    'todoId': todoId
                },
            }).promise()

        } catch (error) {
            logger.error("Error deleting todo", { todoId, error })
            throw new Error("Error deleting todo")
        }

    }
}

function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
        logger.info('Creating a local DynamoDB instance')
        return new XAWS.DynamoDB.DocumentClient({
            region: 'localhost',
            endpoint: 'http://localhost:8000'
        })
    }

    return new XAWS.DynamoDB.DocumentClient()
}
