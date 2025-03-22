const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const validator_domain = function(_domain){
    return true
}

const validator_date = function(_date){
    return true
}

let merchant_schema = new Schema({
    domain:{type:String,required:true,validate:[validator_domain , "Domain is not valid"],unique : false},
    register_date:{type:Date,required:true,validate:[validator_date , "Invalide date"],unique : false, default: () => new Date().toISOString() },
    merchantId:{type:String,required:true,validate:[validator_domain , "MerchantId is not valid"],unique : false,default:""},
    organizitaion:{type:String,required:true,validate:[validator_domain , "organizitaion is not valid"],unique : false,default:""},
    scam:{type:Number,required:true,validate:[validator_domain , "scam is not valid"],unique : false, default: 0},
    refrence:{type:Number,required:true,validate:[validator_domain , "reg is not valid"],unique : false, default: 1},

})

merchant_schema.virtual('isScam').get(function() {
    return this.scam > 0.1184;
});

merchant_schema.virtual('isFraud')
    .get(function() {
        if (this._isFraudulent)
            return this._isFraudulent;
        else
            return 0
    })
    .set(function(value) {
        this._isFraudulent = value;
    });

merchant_schema.set('toObject' , {
    virtuals: true,
})

merchant_schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.__v;
        delete ret._id;
        delete ret.id;
        return ret;
    },
})


module.exports = mongoose.model('merchant', merchant_schema,"merchant");