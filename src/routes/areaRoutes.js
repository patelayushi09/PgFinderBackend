const express = require("express")
const router = express.Router()

const areaController = require('../controllers/areaController')

router.post("/add", areaController.addArea)
router.get("/", areaController.getAreas)
router.get("/getareabycityid/:cityId",areaController.getAreaByCityId)

module.exports = router