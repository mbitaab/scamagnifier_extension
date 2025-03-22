const database = require("./mongo/mongo_db")
const merchant_schema = require("../models/model_merchant")
const report_schema = require("../models/model_report")
const mongoose = require('mongoose')
let localDataBase

class repository{
    /**
     * Saves a merchant to the database.
     * @param {{ domain: string, merchantId: string, organizitaion: string , scam:number }} _merchant_data The Merchant data to save
     * @param {{ error, savedMerchant }} _callback Th callback after save the merchant
     */
    save_merchant(_merchant_data,_callback){
        console.log(`[*] save_merchant : ${_merchant_data.domain} , ${_merchant_data.scam}`)
        const merchant = new merchant_schema(_merchant_data)
        merchant.save()
            .then((savedMerchant) => {
                console.log('Merchant saved successfully')
                if (_callback)
                    _callback(null,savedMerchant)
            }).catch(err => {
                console.error('Error saving merchant:', err)
                if (_callback)
                    _callback(err,"ERROR")
            });
    }

    update_merchant(_id,_merchantId,_callback){
        console.log('start Merchant update successfully')
        merchant_schema.findByIdAndUpdate(_id, { merchantId: _merchantId }, { new: true })
          .then(updatedDocument => {
            if(updatedDocument) {
                console.log('Updated Document:', updatedDocument);
            } else {
                console.log('No document matches the provided query.');
            }
        })
        .catch(err => console.error('Failed to find and update document:', err));
    }

    save_report(_repor_data,_callback){
        const report = new report_schema(_repor_data)
        report.save()
        .then(() => {
            console.log('Report saved successfully')
            if (_callback)
                _callback(null,"Report Saved")
        }).catch(err => {
            console.error('Error saving report:', err)
            if (_callback)
                _callback(err,null)
        });
    }

    get_latest_merchant_status(_domain_name,_callback){
        merchant_schema.find({ domain: _domain_name })
        .sort({ register_date: -1 })
        .limit(1)
        .exec()
        .then(data => {
            _callback(null,data)
        })
        .catch(err => {
            _callback(err)
        });
    
    }

    get_latest_merchant_status_by_id(_merchant_id,_callback){
        merchant_schema.find({ merchantId : _merchant_id })
        .sort({ register_date: -1 })
        .exec()
        .then(data => {
            _callback(null,data)
        })
        .catch(err => {
            _callback(err)
        });
    
    }

    init(){
        localDataBase=database.get()
    }

}

module.exports = repository