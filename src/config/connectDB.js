const { Sequelize } = require("sequelize");

// Option 2: Passing parameters separately (other dialects)
const sequelize = new Sequelize(
  process.env.DB_NAME,         // Tên cơ sở dữ liệu từ biến môi trường
  process.env.DB_USERNAME,     // Tên người dùng cơ sở dữ liệu từ biến môi trường
  process.env.DB_PASSWORD,     // Mật khẩu cơ sở dữ liệu từ biến môi trường
  {
    host: process.env.DB_HOST,     // Host từ biến môi trường
    port: process.env.DB_PORT,     // Cổng từ biến môi trường
    dialect: "mysql",              // Loại cơ sở dữ liệu
    logging: false,
  }
);

let connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

module.exports = connectDB;