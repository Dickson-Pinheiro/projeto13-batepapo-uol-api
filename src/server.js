import express from "express"
import cors from "cors"
import dayjs from "dayjs";
import joi from "joi"

import { chatConnetcion } from "./db/connection.js"
import { ObjectID } from "bson";

const app = express()
app.use(cors())
app.use(express.json())

app.post("/participants", async (req, res) => {
    const { name } = req.body

    let participant = { name, lastStatus: Date.now() }

    const schema = joi.object({
        name: joi.string().required(),
        lastStatus: joi.number().required()
    })

    const validation = schema.validate(participant, { pick: ["name", "lastStatus"], abortEarly: false })

    if (validation.error) {
        return res.status(422).send(validation.error.details)
    }


    try {

        const participantExists = await chatConnetcion.collection("participants").findOne({ name })
        console.log(participantExists)
        if (participantExists) {
            return res.sendStatus(409)
        }

        await chatConnetcion.collection("participants").insertOne(participant);
        await chatConnetcion.collection("messages").insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(participant.lastStatus).format("hh:mm:ss") })
        res.status(201).send();

    } catch (error) {
        console.log(error)
    }

})

app.get("/participants", async (req, res) => {

    const participants = await chatConnetcion.collection("participants").find().toArray();

    return res.send(participants)
})

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers
    let message = { from: user, to, text, type, time: dayjs(Date.now()).format("hh:mm:ss") }

    const messageSchema = joi.object({
        from: joi.string().required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.any().valid("message", "private_message").required(),
        time: joi.string().required()
    })

    const validation = messageSchema.validate(message, { pick: ["from", "to", "text", "type", "time"], abortEarly: false })

    if(validation.error){
        return res.status(422).send(validation.error.details)
    }

    try {

        if( to!== "Todos" ){
            let participantExists = await chatConnetcion.collection("participants").findOne({name: to})
            if(!participantExists){
                return res.sendStatus(422);
            }
        }
        
        await chatConnetcion.collection("messages").insertOne(message)
        return res.status(201).send()
    } catch (error) {
        console.log(error)
    }

})

app.get("/messages", async (req, res) => {
    const { limit } = req.query
    const { user } = req.headers

    const messages = await chatConnetcion.collection("messages").find().toArray()

    let authorizedMessages = messages.filter(m => {
        if (m.type !== "private_message" || m.to === user || m.from === user || m.to === "todos") {
            return true;
        }
        return false;
    })

    if (limit === undefined) {
        return res.send(authorizedMessages.reverse())
    }

    if(isNaN(limit)){
        return res.sendStatus(422)
    }

    if(limit <=0 ){
        return res.sendStatus(422)
    }


    if (authorizedMessages.length <= limit) {
        return res.send(authorizedMessages.reverse())
    }

    return res.send(authorizedMessages.slice(-1 * limit).reverse())

})

app.post("/status", async (req, res) => {
    const { user } = req.headers

    const participant = await chatConnetcion.collection("participants").findOne({name: user})

    if (!participant) {
        return res.sendStatus(404)
    }

  

    await chatConnetcion.collection("participants").updateOne({name: participant.name}, { $set: {name: participant.name, lastStatus: Date.now()}})
    return res.sendStatus(200)
})

async function clearInactiveParticipants() {
    const participants = await chatConnetcion.collection("participants").find().toArray()

    participants.forEach(async (participant) => {
        let atualDate = Date.now()
        if (atualDate - participant.lastStatus >= 10000) {
            await chatConnetcion.collection("messages").insertOne({from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs(Date.now()).format("hh:mm:ss")})
            await chatConnetcion.collection("participants").deleteOne({_id: ObjectID(participant._id)})
        }
    })
}

//setInterval(clearInactiveParticipants, 15000)

app.listen(5000)