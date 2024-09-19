import e from "express";
import db from "../models/index";
import bcrypt from "bcryptjs";
import CommonUtils from "../utils/CommonUtils";
const cloudinary = require("../utils/cloudinary");
const salt = bcrypt.genSaltSync(10);
require("dotenv").config();
const { Op } = require("sequelize");
let nodemailer = require("nodemailer");

let sendMailToUser = (note, userMail, link = null) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_APP,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL_APP,
    to: userMail,
    subject: "Thông báo từ trang Job Finder",
    html: note,
  };
  if (link) {
    mailOptions.html =
      note +
      ` xem thông tin <a href='${process.env.URL_REACT}/${link}'>Tại đây</a> `;
  }
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error.message);
    } else {
    }
  });
};

let checkUserPhoneNumber = (userPhoneNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userPhoneNumber) {
        resolve({
          errCode: 2,
          errMessage: "Missing required fields",
        });
      } else {
        let user = await db.User.findOne({
          where: { phoneNumber: userPhoneNumber },
        });
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
let checkUserEmail = (userEmail) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userEmail) {
        resolve({
          errCode: 2,
          errMessage: "Missing required fields",
        });
      } else {
        let user = await db.User.findOne({
          where: { email: userEmail },
        });
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
let handleHashUserPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    try {
      let hashPassword = "";
      if (password) {
        hashPassword = await bcrypt.hashSync(password, salt);
      }
      resolve(hashPassword);
    } catch (error) {
      reject(error);
    }
  });
};

let getAllUsers = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.limit || !data.offset) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let objectQuery = {
          limit: +data.limit,
          offset: +data.offset,
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.UserDetail,
              as: "UserDetailData",
              attributes: {
                exclude: ["userId", "createdAt", "updatedAt"],
              },
            },
          ],
          raw: true,
          nest: true,
        };
        if (data.searchKey) {
          objectQuery.where = {
            [Op.or]: [
              { firstName: { [Op.like]: `%${data.searchKey}%` } },
              { lastName: { [Op.like]: `%${data.searchKey}%` } },
              { phoneNumber: { [Op.like]: `%${data.searchKey}%` } },
            ],
          };
        }
        let result = await db.User.findAndCountAll(objectQuery);
        resolve({
          errCode: 0,
          errMessage: "Get all users succeed",
          data: result.rows ? result.rows : [],
          count: result.count ? result.count : 0,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

let getUsersById = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let result = await db.User.findOne({
          where: { id: userId },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.UserDetail,
              as: "UserDetailData",
              attributes: {
                exclude: ["userId"],
              },
            },
          ],
          raw: true,
          nest: true,
        });
        if (result.UserDetailData.file) {
          try {
            result.UserDetailData.file = Buffer.from(
              result.UserDetailData.file,
              "base64"
            ).toString("binary");
          } catch (error) {
            console.log("Error decoding base64 file: ", error);
            result.UserDetailData.file = null;
          }
        }
        let listSkill = await db.UserSkill.findAll({
          where: { userId: userId },
          attributes: {
            exclude: ["UserId", "userId", "SkillId", "createdAt", "updatedAt"],
          },
          include: [
            {
              model: db.Skill,
              as: "skillData",
              attributes: {
                exclude: ["createdAt", "updatedAt", "id"],
              },
            },
          ],
          raw: false,
        });
        result.listSkill = listSkill;
        resolve({
          errCode: 0,
          errMessage: "Get user by id succeed",
          data: result,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let handleCreateNewUser = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.email || !data.password) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let checkExist = await checkUserEmail(data.email);
        if (checkExist) {
          resolve({
            errCode: 2,
            errMessage: "User's email already exist",
          });
        } else {
          let imageUrl = "";
          let isHavePassword = true;
          if (!data.password) {
            data.password = `${new Date().getTime().toString()}@jobfinder`;
            isHavePassword = false;
          }
          let hashPassword = await handleHashUserPassword(data.password);
          if (data.image) {
            let uploadResponse = await cloudinary.uploader.upload(data.image, {
              upload_preset: "ml_default",
            });
            imageUrl = uploadResponse.url;
          }
          let newUser = await db.User.create({
            phoneNumber: data.phoneNumber ? data.phoneNumber : null,
            password: hashPassword,
            email: data.email,
            firstName: data.firstName ? data.firstName : null,
            lastName: data.lastName ? data.lastName : null,
            address: data.address ? data.address : null,
            point: data.point ? data.point : 0,
            image: imageUrl ? imageUrl : null,
            dob: data.dob ? data.dob : null,
            roleCode: data.roleCode ? data.roleCode : "USER",
            statusCode: data.statusCode ? data.statusCode : "ACTIVE",
            typeLogin: data.typeLogin ? data.typeLogin : "LOCAL",
            isVerify: data.isVerify ? data.isVerify : 0,
            isUpdate: data.isUpdate ? data.isUpdate : 0,
            isVip: data.isVip ? data.isVip : 0,
            companyId: data.companyId ? data.companyId : null,
          });
          if (!isHavePassword) {
            let note = `<h3>Tài khoản đã tạo thành công</h3>
                                    <p>Tài khoản: ${data.phonenumber}</p>
                                    <p>Mật khẩu: ${data.password}</p>
                        `;
            sendMailToUser(note, data.email);
          }
          resolve({
            errCode: 0,
            errMessage: "Create user succeed",
            data: newUser,
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
//handle login
let handleLogin = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.email || !data.password) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let userData = {};
        let user = await db.User.findOne({
          where: {
            email: data.email,
            typeLogin: "LOCAL",
          },
        });
        if (user) {
          let check = await bcrypt.compareSync(data.password, user.password);
          if (check) {
            if (user.statusCode === "ACTIVE") {
              userData.errMessage = "Login succeed";
              userData.errCode = 0;
              userData.data = user;
              userData.token = CommonUtils.encodeToken(user.id);
            } else {
              userData.errMessage = "User is not active";
              userData.errCode = 3;
            }
          } else {
            userData.errMessage = "Password or Email is incorrect";
            userData.errCode = 2;
          }
        } else {
          userData.errMessage = "User is not exist";
          userData.errCode = 4;
        }
        resolve(userData);
      }
    } catch (error) {
      reject(error);
    }
  });
};

let handleSetDataUserDetail = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.userId || !data.data) {
        resolve({
          errCode: 1,
          errMessage: "Missing required fields",
        });
      } else {
        let user = await db.User.findOne({
          where: { id: data.userId },
          attributes: {
            exclude: ["password"],
          },
          raw: false,
        });
        if (user) {
          if (
            data.image ||
            data.dob ||
            data.firstName ||
            data.lastName ||
            data.address ||
            data.phoneNumber
          ) {
            if (data.image) {
              let uploadResponse = await cloudinary.uploader.upload(
                data.image,
                {
                  upload_preset: "ml_default",
                }
              );
              user.image = uploadResponse.url;
            }
            if (data.dob) {
              user.dob = data.dob;
            }
            if (data.firstName) {
              user.firstName = data.firstName;
            }
            if (data.lastName) {
              user.lastName = data.lastName;
            }
            if (data.address) {
              user.address = data.address;
            }
            if (data.phoneNumber) {
              user.phoneNumber = data.phoneNumber;
            }
            await user.save();
          }
          let userDetail = await db.UserDetail.findOne({
            where: { userId: user.id },
            raw: false,
          });
          if (userDetail) {
            userDetail.addressCode = data.data.addressCode
              ? data.data.addressCode
              : null;
            userDetail.salaryJobCode = data.data.salaryJobCode
              ? data.data.salaryJobCode
              : null;
            userDetail.experienceJobCode = data.data.experienceJobCode
              ? data.data.experienceJobCode
              : null;
            userDetail.genderCode = data.data.genderCode
              ? data.data.genderCode
              : null;
            userDetail.categoryJobCode = data.data.categoryJobCode;
            userDetail.jobLevelCode = data.data.jobLevelCode
              ? data.data.jobLevelCode
              : null;
            userDetail.workTypeCode = data.data.workTypeCode
              ? data.data.workTypeCode
              : null;
            userDetail.isTakeMail = data.data.isTakeMail
              ? data.data.isTakeMail
              : 0;
            userDetail.isFindJob = data.data.isFindJob
              ? data.data.isFindJob
              : 0;
            userDetail.file = data.data.file ? data.data.file : null;
            await userDetail.save();
          } else {
            let params = {
              userId: user.id,
              addressCode: data.data.addressCode ? data.data.addressCode : null,
              salaryJobCode: data.data.salaryJobCode
                ? data.data.salaryJobCode
                : null,
              experienceJobCode: data.data.experienceJobCode
                ? data.data.experienceJobCode
                : null,
              genderCode: data.data.genderCode ? data.data.genderCode : null,
              categoryJobCode: data.data.categoryJobCode
                ? data.data.categoryJobCode
                : null,
              jobLevelCode: data.data.jobLevelCode
                ? data.data.jobLevelCode
                : null,
              workTypeCode: data.data.workTypeCode
                ? data.data.workTypeCode
                : null,
              isTakeMail: data.data.isTakeMail ? data.data.isTakeMail : 0,
              isFindJob: data.data.isFindJob ? data.data.isFindJob : 0,
              file: data.data.file ? data.data.file : null,
            };
            await db.UserDetail.create(params);
          }
          user.isUpdate = 1;
          await user.save();
          resolve({
            errCode: 0,
            errMessage: "Set data user detail succeed",
            user: user,
            data: data.data,
          });
        } else {
          resolve({
            errCode: 3,
            errMessage: "User is not exist",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  getAllUsers: getAllUsers,
  handleCreateNewUser: handleCreateNewUser,
  handleLogin: handleLogin,
  getUsersById: getUsersById,
  handleSetDataUserDetail: handleSetDataUserDetail,
};
