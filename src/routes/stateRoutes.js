const express = require("express")
const router = express.Router()

const stateController = require('../controllers/stateController')

router.post("/addstate", stateController.addState)
router.get("/getallstates", stateController.getStates)


module.exports = router