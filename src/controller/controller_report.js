const {MongoError} = require('mongodb')

const express = require('express')
const router  = express.Router()
const body_parser = require('body-parser')
const controller_root = require('./controller_root')
const {save_report} = require('../service/service_report')

router.use(body_parser.json())
router.use(body_parser.urlencoded({extended:true}))
router.use(express.urlencoded({extended:true}))
router.use(express.json())

router.get("/submite" , async(req,res,next) =>{
    res.type('application/json');
    const {domain,scam,text} = req.query
    console.log(`domain = ${domain} , scam = ${scam} , report = ${text}`)
    save_report(domain,scam,text,(err,data)=>{
        if (data){
            controller_root.req_success(res,data)
        }else if(err){
            controller_root.req_fail(res,err)
        }
    })

})

module.exports = router
