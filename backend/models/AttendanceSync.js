import mongoose from "mongoose";

const schema = new mongoose.Schema({

    lastTransactionId: {
        type: Number,
        default: 0
    }

});

export default mongoose.model(
    "AttendanceSync",
    schema
);