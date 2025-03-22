const { exec } = require("child_process");
const Docker = require("dockerode");
//const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const docker = new Docker({
  host: `${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`,
  port: `${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_PORT}`,
});
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { MongoError } = require("mongodb");
const express = require("express");
const router = express.Router();
const body_parser = require("body-parser");
const controller_root = require("./controller_root");
const domainFilePath = path.join(__dirname, '../../assets/whitelist.txt');
let domainSet = new Set();

fs.readFile(domainFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }
    const domains = data.split('\n').map(domain => domain.trim()).filter(domain => domain);
    domainSet = new Set(domains);
    console.log('Whitelists domains loaded into memory');
});

function isDomain(text) {
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    return domainRegex.test(text);
}


const {
  save_merchant,
  get_last_merchant_status,
  get_merchant_by_id,
  update_merchant,
} = require("../service/service_merchant");

router.use(body_parser.json());
router.use(body_parser.urlencoded({ extended: true }));
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

function countUniqueScamDomains(data, excludeDomain) {

  const filteredDomains = data.filter(item =>{
    console.log(`excludeDomain : ${excludeDomain} item.scam : ${item.scam}`)
    item.domain !== excludeDomain && item.scam>0
  } 
  );
  const uniqueDomains = new Set(filteredDomains.map(item => item.domain));
  return uniqueDomains.size;
}

const saveMerchantPromise = (_domain,_merchantId,_organizitaion,_scam) => {
  return new Promise((resolve, reject) => {
    save_merchant(_domain=_domain,_merchantId=_merchantId,_organizitaion=_organizitaion,_scam=_scam, _callback=(error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

async function saveMerchant() {
  try {
    const mongoModel = await saveMerchantPromise('example.com', 'merchant123', 'Org1', false);
    console.log('Mongoose model data:', mongoModel);
    // Access properties or methods of the mongoose model
    console.log('Merchant Name:', mongoModel.name); // Example property access
  } catch (error) {
    console.error('Error:', error);
  }
}

router.get("/status", async (req, res, next) => {
  res.type("application/json");
  const domain = req.query.domain;
  if (!domain || !isDomain(domain)) {
    //controller_root.req_fail_500(res,"Domain query parameter is required")
    controller_root.req_success(res,{})
    return
}

if (domainSet.has(domain)) {
    controller_root.req_success(res,"{}")
    return
}

  const getLastMerchantStatusPromise = (domain) => {
    return new Promise((resolve, reject) => {
      get_last_merchant_status(domain, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  };



  const getMerchantByIdPromise = (id) => {
    return new Promise((resolve, reject) => {
      get_merchant_by_id(id, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  };
  const updateMerchantPromise = (id,merchant) => {
    return new Promise((resolve, reject) => {
      console.log("promise ")
      update_merchant(id,merchant, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  };

  try {
    // Check db
    var db_data = await getLastMerchantStatusPromise(domain);
    try{
      if (db_data && db_data.length > 0) {
        console.log(`1 : ${db_data[0]}`)
        const tmp = db_data[0].merchantId
        if (tmp != null){
          const list_history = await getMerchantByIdPromise(tmp)
          is_fraud = countUniqueScamDomains(list_history,domain)
          console.log(`2 : ${is_fraud}`)
          db_data[0].isFraud = is_fraud
          console.log(`3 : ${db_data[0]}`)
        }else{
          console.log(`no merchant id`)
        }
        controller_root.req_success(res, db_data[0]);
        return;
      }
    } catch (e) {
      if (e instanceof ReferenceError) {
          console.log('myVar is not defined');
      }
    }
    
    // is domain feature extracotr running ?
    is_running = false;
    try {
      const container_is_running_df = docker.getContainer(
        `domain-feature-extractor-${domain}`
      );
      const _container_is_running_df = await new Promise((resolve, reject) => {
        container_is_running_df.inspect((err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      if (
        _container_is_running_df.State &&
        _container_is_running_df.State.Status === "running"
      ) {
        console.log("The container is running.");
        controller_root.req_success(res, "queued");
        is_running = true;
        return;
      }
    } catch (ex) {
      is_running = false;
    }
    // is domain classifier running ?
    try {
      const container_is_running_dc = docker.getContainer(
        `scamagnifier-domain-classifier-${domain}`
      );
      const _container_is_running_dc = await new Promise((resolve, reject) => {
        container_is_running_dc.inspect((err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      if (
        _container_is_running_dc.State &&
        _container_is_running_dc.State.Status === "running"
      ) {
        console.log("The container is running.");
        controller_root.req_success(res, "queued");
        is_running = true;
        return;
      }
    } catch (ex) {
      is_running = false;
    }
    // is shop classifier running ?
    try {
      const container_is_running_sc = docker.getContainer(
        `scamagnifier-shop-classifier-${domain}`
      );
      const _container_is_running_sc = await new Promise((resolve, reject) => {
        container_is_running_sc.inspect((err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      if (
        _container_is_running_sc.State &&
        _container_is_running_sc.State.Status === "running"
      ) {
        console.log("The container is running.");
        controller_root.req_success(res, "queued");
        is_running = true;
        return;
      }
    } catch (ex) {
      is_running = false;
    }
    // is AC running ?
    try {
      const container_is_running_ac = docker.getContainer(
        `autocheck-${domain}`
      );
      const _container_is_running_ac = await new Promise((resolve, reject) => {
        container_is_running_ac.inspect((err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      if (
        _container_is_running_ac.State &&
        _container_is_running_ac.State.Status === "running"
      ) {
        console.log("The container is running.");
        controller_root.req_success(res, "queued");
        is_running = true;
        return;
      }
    } catch (ex) {
      is_running = false;
    }

    if (is_running == false) {
      controller_root.req_success(res, "queued");
      const docker_volume = process.env.DOCKER_VOLUME;
      const timestamp = new Date().getTime();
      const baseDir = `${docker_volume}/ext_req/${domain}_${timestamp}`;
      const subdirectories = [
        "",
        "/source_home",
        "/screenshots",
        "/source_checkout",
      ];

      const mkdirIfNotExists = (dirPath) => {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      };

      subdirectories.forEach((subdir) => {
        const dirPath = path.join(baseDir, subdir);
        mkdirIfNotExists(dirPath);
      });

      feature_ext = await processDomainFeatureExtInBackground(domain, baseDir);
      if (feature_ext && typeof feature_ext === "number" && feature_ext === 1) { // if DFE failed , then save site as N/A
        rate = await processDomainClassiferInBackground(domain, baseDir);
        isShop = await processShopClassiferInBackground(domain, baseDir); // is the domain shop ?
        if (isShop){// if domain is not shop then save az N/A
          _merchant = await saveMerchantPromise(_domain=domain, _merchantId="N/A", _organizitaion="N/A", _scam=Number(rate));// Save domain az scam or legit , then go to AC
          merchant_id = await processAcInBackground(domain, baseDir); // Run AC
          if (merchant_id) {
            _merchant.merchant_id = merchant_id
            const results = await updateMerchantPromise(_merchant._id,merchant_id) // update merchantId if found
          }
        }else{
          _merchant = await saveMerchantPromise(_domain=domain, _merchantId="N/A", _organizitaion="N/A", _scam=Number(-1));
        }
      }else{
        _merchant = await saveMerchantPromise(_domain=domain, _merchantId="N/A", _organizitaion="N/A", _scam=Number(-1));
      }
    }
  } catch (error) {
    console.error(error);
    controller_root.req_fail_500(res, "Error");
  }
});

router.post("/status", async (req, res, next) => {});

async function processShopClassiferInBackground(domain, baseDir) {
  try {
    console.error(
      `[*] start Shop classifier : ${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`
    );

    const seleniumAddress = process.env.SCAMAGNIFIER_EXT_SELENIUM_ADDRESS;
    const container = await docker.createContainer({
      Image: "scamagnifier-shop-classifier",
      Cmd: [
        "python",
        "./src/app.py",
        "--input_dir",
        `${baseDir}/source_home`,
        "--input_file",
        `${baseDir}/classify.csv`,
        "--output_file",
        `${baseDir}/shop.csv`,
      ],
      HostConfig: {
        AutoRemove: true,
        NetworkMode: `${process.env.SCAMAGNIFIER_EXT_NETADAPTER_HOST}`,
        Binds: [`${process.env.SCAMAGNIFIER_EXT_V_DATA_HOST}:/app/data`],
      },
      Env: [`SELENIUM_ADDRESS=${seleniumAddress}`],
      name: `scamagnifier-shop-classifier-${domain}`,
    });

    await container
      .start()
      .then(() => {
        console.log("[*]Container started successfully!");
      })
      .catch((error) => {
        console.error("[*]Failed to start container:", error.message);
      });
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    let containerOutput = "";
    stream.on("data", (chunk) => {
      containerOutput += chunk.toString();
    });

    await new Promise((resolve, reject) => {
      container.wait((err, data) => (err ? reject(err) : resolve(data)));
    });
    console.log(containerOutput);
    const pattern = /SHOP_CLASSIFIER:.+/;
    const match = containerOutput.match(pattern);
    return match ? match[0] : null;
  } catch (error) {
    console.error(error);
    return null;
    //res.status(500).send(error.message);
  }
}

async function processDomainFeatureExtInBackground(domain, baseDir) {
  try {
    console.log(
      `[*] start Domain feature extractor : ${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`
    );
    const seleniumAddress = process.env.SCAMAGNIFIER_EXT_SELENIUM_ADDRESS;
    const container = await docker.createContainer({
      Image: "domain-feature-extractor",
      Cmd: [
        "python",
        "./src/app.py",
        "--url",
        domain,
        "--source_path",
        `${baseDir}/source_home`,
        "--output_file",
        `${baseDir}/features.pkl`,
        "--selected_languages",
        "en"
      ],
      HostConfig: {
        AutoRemove: true,
        NetworkMode: `${process.env.SCAMAGNIFIER_EXT_NETADAPTER_HOST}`,
        Binds: [`${process.env.SCAMAGNIFIER_EXT_V_DATA_HOST}:/app/data`],
      },
      Env: [`SELENIUM_ADDRESS=${seleniumAddress}`],
      name: `domain-feature-extractor-${domain}`,
    });

    await container
      .start()
      .then(() => {
        console.log("[*]Container started successfully!");
      })
      .catch((error) => {
        console.error("[*]Failed to start container:", error.message);
      });
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    let containerOutput = "";
    stream.on("data", (chunk) => {
      console.log(chunk.toString())
      containerOutput += chunk.toString();
    }); 

    await new Promise((resolve, reject) => {
      container.wait((err, data) => (err ? reject(err) : resolve(data)));
    });
    console.log(
      `[*] Finished Domain feature extractor : ${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`
    );
    return 1;
  } catch (error) {
    console.log(`[*] Domain feature extractor error : ${error}`);
    return -1;
    //res.status(500).send(error.message);
  }
}

async function processDomainClassiferInBackground(domain, baseDir) {
  try {
    console.log(
      `[*] start Domain clssifier : ${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`
    );
    const seleniumAddress = process.env.SCAMAGNIFIER_EXT_SELENIUM_ADDRESS;
    const container = await docker.createContainer({
      Image: "scamagnifier-domain-classifier",
      Cmd: [
        "python",
        "./src/app.py",
        "--input_file",
        `${baseDir}/features.pkl`,
        "--output_file",
        `${baseDir}/classify.csv`,
      ],
      HostConfig: {
        AutoRemove: true,
        NetworkMode: `${process.env.SCAMAGNIFIER_EXT_NETADAPTER_HOST}`,
        Binds: [`${process.env.SCAMAGNIFIER_EXT_V_DATA_HOST}:/app/data`],
      },
      Env: [`SELENIUM_ADDRESS=${seleniumAddress}`],
      name: `scamagnifier-domain-classifier-${domain}`,
    });

    await container
      .start()
      .then(() => {
        console.log("[*]Container started successfully!");
      })
      .catch((error) => {
        console.error("[*]Failed to start container:", error.message);
      });
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    let containerOutput = "";
    stream.on("data", (chunk) => {
      console.log(chunk.toString())
      containerOutput += chunk.toString();
    });

    await new Promise((resolve, reject) => {
      container.wait((err, data) => (err ? reject(err) : resolve(data)));
    });
    console.log(
      `[*] finish Domain clssifier : ${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`
    );
    // const pattern = /DOMAIN_CLASSIFIER:\d+\.\d+,\d+\.\d+/;
    // const match = containerOutput.match(pattern);
    // if (match) {
    //     const lastPart = match[0].split(",")[1];
    //     console.log(lastPart);
    //     return lastPart
    // } else {
    //     console.log("Pattern not found");
    //     return "0"
    // }

    const pattern = /DOMAIN_PRED_CLASSIFIER:(legit|scam)/;
    const match = containerOutput.match(pattern);
    if (match) {
        const detected = match[1]; // match[1] contains either "legit" or "scam"
        console.log(`Detected: ${detected}`);
        if (match[1] == "scam")
            return 1;
        else
            return 0
    } else {
        console.log("Pattern not found");
        return "0";
    }
    
      
  } catch (error) {
    console.error(`[*] error Domain clssifier : ${error}`);
    return null;
  }
}

async function processAcInBackground(domain, baseDir) {
  try {
    console.error(
      `[*] start AC : ${process.env.SCAMAGNIFIER_EXT_DOCKER_HOST_ADDRESS}`
    );

    const seleniumAddress = process.env.SCAMAGNIFIER_EXT_SELENIUM_ADDRESS;
    const container = await docker.createContainer({
      Image: "autocheck",
      Cmd: [
        "python",
        "./src/app.py",
        "--url",
        domain,
        "--log_file_address",
        `${baseDir}/`,
        "--p_log_file_address",
        `${baseDir}/log.jsonl`,
        "--screen_file_address",
        `${baseDir}/screenshots/`,
        "--html_file_address",
        `${baseDir}/source_checkout/`,
        "--save_db",
        "no"
      ],
      HostConfig: {
        AutoRemove: true,
        NetworkMode: `${process.env.SCAMAGNIFIER_EXT_NETADAPTER_HOST}`,
        Binds: [`${process.env.SCAMAGNIFIER_EXT_V_DATA_HOST}:/app/data`],
      },
      Env: [
        `SELENIUM_ADDRESS=${seleniumAddress}`,
        `TRANSFORMERS_CACHE=/app/data/hf_cache/`,
      ],
      name: `autocheck-${domain}`,
    });

    await container
      .start()
      .then(() => {
        console.log("[*]Container started successfully!");
      })
      .catch((error) => {
        console.error("[*]Failed to start container:", error.message);
      });
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    let containerOutput = "";
    stream.on("data", (chunk) => {
      containerOutput += chunk.toString();
    });

    await new Promise((resolve, reject) => {
      container.wait((err, data) => (err ? reject(err) : resolve(data)));
    });
    console.log(containerOutput);

    const pattern = /MERCHANTID:([^\s]+)/g;
    const merchantIds = [];
    let match;
    while ((match = pattern.exec(containerOutput)) !== null) {
      merchantIds.push(match[1]);
      scam = 0;
      if (match[1].length > 1) {
        return match[1];
        // const data = getLastMerchantStatusByIdPromise(match[1])
        // if (data){
        //   scam = data.scam
        // }
        // save_merchant(domain,match[1],"paypal",null,scam)
      }
    }
    if (merchantIds.length === 0) {
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
    //res.status(500).send(error.message);
  }
}

module.exports = router;
