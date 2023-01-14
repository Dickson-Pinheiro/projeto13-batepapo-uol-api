import { MongoClient } from "mongodb";
import dotenv from "dotenv"
dotenv.config()

const connection = new MongoClient(process.env.DATABASE_URL)
await connection.connect()
const chatConnetcion = connection.db()


export {chatConnetcion}