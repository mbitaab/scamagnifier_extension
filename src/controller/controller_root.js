const req_fail = (response,message) =>{
    response.status(400)
    response.json({result: 'fail',message:message})
}

const req_fail_500 = (response,message) =>{
    response.status(500)
    response.json({result: 'fail',message:message})
}

const req_fail_404 = (response,message) =>{
    response.status(404)
    response.json({result: 'fail',message:message})
}

const req_success = (response,_data) =>{
    response.status(200)
    response.json({result: 'success',data:_data})
}

exports.req_fail = req_fail
exports.req_success = req_success
exports.req_fail_404=req_fail_404
exports.req_fail_500 = req_fail_500