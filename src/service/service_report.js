const repos = require("../repository/repository")
const report_schema = require("../models/model_report")

let repository = new repos()

const save_report = (_domain,_scam,_text,_callback) =>{
    repository.save_report({domain:_domain, scam:_scam, report:_text},_callback)
}

exports.save_report = save_report
