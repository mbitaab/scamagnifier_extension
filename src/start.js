const creatServer = require('./app')
const dotenv = require('dotenv');

dotenv.config();
const port = process.env.PORT || 1080;
let server=new creatServer()

//Listening
server.listen(port,()=>{
    console.log(`Server is running , port : ${port}`)
});