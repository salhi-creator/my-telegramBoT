let express = require('express')
let http = require('http')
const app = express()
let dotenv = require("dotenv")
const port = process.env.PORT || 3500
const server = http.createServer(app)
app.use(express.json());
server.listen(port,()=>{
    console.log('bot server is working')
})


app.post("/webhook", (req, res) => {
  console.log("webHook telegram shit : ",req.body);
  res.sendStatus(200);
});