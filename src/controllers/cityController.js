const City = require('../models/cityModel')

//add city
const addCity = async (req, res) => {
    try {

        const savedCity = await City.create(req.body);
        res.status(201).json({
            message: "City added successfully",
            data: savedCity
        })
    } catch (err) {
        res.status(500).json({ message: err });
    }
};

//get city
const getCities = async (req, res) => {
    try {
        const cities = await City.find().populate("stateId");
        res.status(200).json({
            message: "All cities",
            data: cities,
        });
    } catch (err) {
        res.status(500).json({ message: err });
    }
};


const getCityByStateId = async (req, res) => {
    const stateId = req.params.stateId;
    try {
     
        console.log(`Fetching cities for stateId: ${stateId}`);

     
        const cities = await City.find({ stateId: stateId });

   
        if (cities.length > 0) {
            res.status(200).json({
                message: "Cities found",
                data: cities,
            });
        } else {
            
            res.status(404).json({
                message: "No cities found for this state",
            });
        }
    } catch (err) {
       
        res.status(500).json({
            message: "An error occurred while fetching cities",
            error: err,
        });
    }
};
module.exports = {
    addCity,
    getCities,
    getCityByStateId,
};