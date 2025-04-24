const State = require('../models/stateModel')

//add state
const addState = async (req, res) => {
    try {

        const savedState = await State.create(req.body);
        res.status(201).json({
            message: "state added successfully",
            data: savedState
        })
    } catch (err) {
        res.status(500).json({ message: err });
    }
};

//get state
const getStates = async (req, res) => {
    try {
        const states = await State.find();
        res.status(200).json({
            message: "All states fetched successfully",
            data: states,
        });
    } catch (err) {
        res.status(500).json({ message: err });
    }
};


module.exports = {
    addState,
    getStates,
};