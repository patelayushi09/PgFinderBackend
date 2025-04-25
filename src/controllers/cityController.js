const City = require('../models/cityModel');


// Add City
const addCity = async (req, res) => {
  try {
    const savedCity = await City.create(req.body);
    res.status(201).json({
      message: "City added successfully",
      data: savedCity
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Cities
const getCities = async (req, res) => {
  try {
    const cities = await City.find().populate("stateId");
    res.status(200).json({
      message: "All cities",
      data: cities,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Cities by State ID
const getCityByStateId = async (req, res) => {
  const stateId = req.params.stateId;
  try {
    if (!mongoose.Types.ObjectId.isValid(stateId)) {
      return res.status(400).json({ message: "Invalid state ID" });
    }

    const cities = await City.find({ stateId: new mongoose.Types.ObjectId(stateId) });

    if (cities.length === 0) {
      return res.status(200).json({ message: "No cities found", data: [] });
    }

    res.status(200).json({
      message: "city found",
      data: cities,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching cities",
      error: err.message,
    });
  }
};

module.exports = {
  addCity,
  getCities,
  getCityByStateId,
};
