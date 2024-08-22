const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    suggestion: {
      type: String,
      required: true,
    },
    coValue: {
      type: String,
    },
  },
  { timestamps: true }
);

const Communication = mongoose.model("Communication", communicationSchema);

module.exports = Communication;
