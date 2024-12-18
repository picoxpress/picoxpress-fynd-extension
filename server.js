const axios = require('axios');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require("path");
const sqlite3 = require('sqlite3').verbose();
const serveStatic = require("serve-static");
const { readFileSync } = require('fs');
const { setupFdk } = require("@gofynd/fdk-extension-javascript/express");
const { SQLiteStorage } = require("@gofynd/fdk-extension-javascript/express/storage");
const sqliteInstance = new sqlite3.Database('session_storage.db');
const productRouter = express.Router();

const {
    ApplicationConfig,
} = require("@gofynd/fdk-client-javascript");

let applicationConfig = new ApplicationConfig({
    applicationID: "6731cee2bac45d383cf8158e",
    applicationToken: "GPXusV-M6",
});

applicationConfig.setLogLevel("debug");


const fdkExtension = setupFdk({
    api_key: process.env.EXTENSION_API_KEY,
    api_secret: process.env.EXTENSION_API_SECRET,
    base_url: process.env.EXTENSION_BASE_URL,
    cluster: process.env.FP_API_DOMAIN,
    callbacks: {
        auth: async (req) => {
            // Write you code here to return initial launch url after auth process complete
            if (req.query.application_id)
                return `${req.extension.base_url}/company/${req.query['company_id']}/application/${req.query.application_id}`;
            else
                return `${req.extension.base_url}/company/${req.query['company_id']}`;
        },
        
        uninstall: async (req) => {
            // Write your code here to cleanup data related to extension
            // If task is time taking then process it async on other process.
        }
    },
    storage: new SQLiteStorage(sqliteInstance,"exapmple-fynd-platform-extension"), // add your prefix
    access_mode: "offline",
    webhook_config: {
        api_path: "/api/webhook-events",
        notification_email: "basra@picoxpress.com",
        event_map: {
            "company/product/delete": {
                "handler": (eventName, body) => {
                    console.log(JSON.stringify(body));
                    console.log(eventName)
                },
                "version": '1'
            },
            "application/shipment/create": {
                "handler": (eventName, body) => {
                    console.log(JSON.stringify(body))
                    createShipment(body)
                },
                "version": '1'
            }
        }
    },
});

const createShipment = async (body) => {
    let applicationId = body.application_id;
    let companyId = body.company_id;
    let shipment = body.payload.shipment;
    const url = "http://api.picoxpress.com/fynd/create/shipment";
    const headers = {
        "Content-Type": "application/json",
        "application_id": applicationId,
        "company_id": companyId
    };
    try {
        const response = await axios.post(url, shipment, { headers });
        console.log("Response Data:", response.data);
        const partnerClient = fdkExtension.getPlatformClient('9189');
        const trackingResponse = await partnerClient.order.updateShipmentTracking({body: response.data});
        console.log("Tracking Response Data:", trackingResponse.data);
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

const STATIC_PATH = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'frontend', 'public' , 'dist')
    : path.join(process.cwd(), 'frontend');
    
const app = express();
const partnerApiRoutes = fdkExtension.partnerApiRoutes;

// Middleware to parse cookies with a secret key
app.use(cookieParser("ext.session"));

// Middleware to parse JSON bodies with a size limit of 2mb
app.use(bodyParser.json({
    limit: '2mb'
}));

// Serve static files from the React dist directory
app.use(serveStatic(STATIC_PATH, { index: false }));

// FDK extension handler and API routes (extension launch routes)
app.use("/", fdkExtension.fdkHandler);

// Route to handle webhook events and process it.
app.post('/api/webhook-events', async function(req, res) {
    try {
      console.log(`Webhook Event: ${req.body.event} received`)
        console.log(`Webhook Event: ${JSON.stringify(req.body)} received`)
      await fdkExtension.webhookRegistry.processWebhook(req);
      return res.status(200).json({"success": true});
    } catch(err) {
      console.log(`Error Processing ${req.body.event} Webhook`);
      return res.status(500).json({"success": false});
    }
})

productRouter.get('/', async function view(req, res, next) {
    try {
        const {
            platformClient
        } = req;
        const data = await platformClient.catalog.getProducts()
        return res.json(data);
    } catch (err) {
        next(err);
    }
});

// Get products list for application
productRouter.get('/application/:application_id', async function view(req, res, next) {
    try {
        const {
            platformClient
        } = req;
        const { application_id } = req.params;
        const data = await platformClient.application(application_id).catalog.getAppProducts()
        return res.json(data);
    } catch (err) {
        next(err);
    }
});

productRouter.get('/scheme', async function view(req, res, next) {
    try {
        //const partnerClient = fdkExtension.getPartnerClient('6734619b8810c79f7768110d');
        const {
            partnerClient
        } = req;
        try {
            const data = await partnerClient.logistics.createCourierPartnerScheme({
                    body:
                        {
                            extension_id: "67569fc640aa96b453a2ae18",
                            scheme_id: "picoxpress_sdd",
                            name: "PicoXpress SDD",
                            weight: {"gte": 0, "lte": 25},
                            transport_type: "surface",
                            region: "intra-city",
                            delivery_type: "same-day",
                            payment_mode: [
                                "PREPAID",
                                "COD"
                            ],
                            stage: "enabled",
                            feature: {
                                doorstep_qc: false,
                                qr: true,
                                mps: true,
                                ndr: true,
                                dangerous_goods: false,
                                fragile_goods: false,
                                restricted_goods: false,
                                cold_storage_goods: false,
                                doorstep_exchange: false,
                                doorstep_return: false,
                                product_installation: false,
                                openbox_delivery: false,
                                multi_pick_single_drop: true,
                                single_pick_multi_drop: true,
                                multi_pick_multi_drop: true,
                                ewaybill: false
                            }
                        }
                }
            );
            console.log(JSON.stringify(data));
            return res.json(data);
        } catch (e) {
            console.log('Got error');
            console.log(JSON.stringify(e));
            return res.json({});
        }
    } catch (err) {
        next(err);
    }
});


// FDK extension api route which has auth middleware and FDK client instance attached to it.
//platformApiRoutes.use('/products', productRouter);

partnerApiRoutes.use('/products', productRouter);

// If you are adding routes outside of the /api path, 
// remember to also add a proxy rule for them in /frontend/vite.config.js
app.use('/api', partnerApiRoutes);

// Serve the React app for all other routes
app.get('*', (req, res) => {
    return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(path.join(STATIC_PATH, "index.html")));
});

module.exports = app;
