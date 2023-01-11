import express from "express"
import cors from "cors"
import dayjs from "dayjs";

const participants = [];
const messages = [];

const app = express()
app.use(cors())
app.use(express.json())

app.post("/participants", (req, res) => {
    const {name} = req.body

    let participant = {name, lastStatus: Date.now()}

    participants.push(participant)

    messages.push({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(participant.lastStatus).format("hh:mm:ss")})
    res.status(201).send();
})

app.get("/participants", (req, res) => {
    return res.send(participants)
})

app.post("/messages", (req, res) => {
    const {to, text, type} = req.body
    const {user} = req.headers

    let message = {from: user, to, text, type, time: dayjs(Date.now()).format("hh:mm:ss")}
    messages.push(message)
    return res.status(201).send()
})

app.get("/messages", (req, res) => {
    const {limit} = req.query
    const {user} = req.headers

    let authorizedMessages = messages.filter(m => {
        if(m.type !== "private_message" || m.to === user || m.from === user){
            return true;
        } 
            return false;
    })

    if(limit === undefined){
        return res.send(authorizedMessages)
    }

    let limitInt = Number(limit)


    if(authorizedMessages.length <= limit){
        return res.send(authorizedMessages)
    }

    return res.send(authorizedMessages.slice(-1 * limit))

})

app.listen(5000)