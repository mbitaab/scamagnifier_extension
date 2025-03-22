const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const validator_domain = function(_domain){
    return true
}

const validator_date = function(_date){
    return true
}

const validator_report = function(_date){
    return true
}

let report_schema = new Schema({
    domain:{type:String,required:true,validate:[validator_domain , "Domain is not valid"],unique : false},
    register_date:{type:Date,required:true,validate:[validator_date , "Invalide date"],unique : false, default: () => new Date().toISOString() },
    scam:{type:Number,required:true,validate:[validator_report , "scam is not valid"],unique : false, default: 0},
    report:{type:String,required:true,validate:[validator_domain , "report is not valid"],unique : false}
})

report_schema.set('toJSON', {
    getters: true
})

report_schema.set('toJSON', {
    getters: true,
    transform: (doc, ret) => {
        delete ret.__v;
        delete ret._id;
        delete ret.id;
        return ret;
    },
})


module.exports = mongoose.model('report', report_schema,"report");