const repos = require("../repository/repository")
const merchant_schema = require("../models/model_merchant")

let repository = new repos()

const save_merchant = (_domain,_merchantId,_organizitaion,_scam,_callback) =>{
    repository.save_merchant({domain: _domain,merchantId: _merchantId,organizitaion: _organizitaion, scam : _scam},_callback)
}

const update_merchant = (_id,_merchant_id , _callback) => {
    repository.update_merchant(_id,_merchant_id , _callback)
}

const get_last_merchant_status = (_domain,_callback) => {
    repository.get_latest_merchant_status(_domain , _callback)
}

const get_merchant_by_id = (_id,_callback) => {
    repository.get_latest_merchant_status_by_id(_id,_callback)
}

exports.save_merchant = save_merchant
exports.get_last_merchant_status = get_last_merchant_status
exports.get_merchant_by_id = get_merchant_by_id
exports.update_merchant= update_merchant