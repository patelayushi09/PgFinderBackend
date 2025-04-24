const Area = require('../models/areaModel')

//add area
const addArea = async (req, res) => {
    try {

        const savedArea = await Area.create(req.body);
        res.status(201).json({
            message: "Area added successfully",
            data: savedArea
        })
    } catch (err) {
        res.status(500).json({ message: err });
    }
};

//get area
const getAreas = async (req, res) => {
    try {
        const areas = await Area.find().populate("cityId").populate("stateId");
        res.status(200).json({
            message: "All Areas",
            data: areas,
        });
    } catch (err) {
        res.status(500).json({ message: err });
    }
};

//get area by city id
const getAreaByCityId = async(req,res)=>{
    try{
        const areas= await Area.find({cityId:req.params.cityId})
        res.status(200).json({
            message: "Area found",
            data: areas,
        });
    } catch (err) {
        res.status(500).json({ message: "Area not found" });
    }
}


module.exports = {
    addArea,
    getAreas,
    getAreaByCityId,
};