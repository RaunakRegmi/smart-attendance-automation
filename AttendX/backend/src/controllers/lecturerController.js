const Lecturer = require('../models/Lecturer');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { Op } = require('sequelize');
const credentialDeliveryService = require('../services/credentialDeliveryService');

const VALID_CHANNELS = ['email', 'sms'];
const validateChannels = (raw) => {
  if (!raw) return { channels: [], error: null };
  const arr = Array.isArray(raw) ? raw : [raw];
  const channels = arr.filter((c) => VALID_CHANNELS.includes(String(c).toLowerCase())).map((c) => String(c).toLowerCase());
  return { channels, error: null };
};

exports.getLecturers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { count, rows } = await Lecturer.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const lecturerIds = rows.map((l) => l.id);
    const userIds = rows.filter((l) => l.userId).map((l) => l.userId);
    const subjectMap = new Map();
    const userMap = new Map();

    if (lecturerIds.length) {
      const subjects = await Subject.findAll({
        where: { lecturerId: { [Op.in]: lecturerIds } },
        attributes: ['id', 'subjectCode', 'subjectName', 'lecturerId'],
      });
      for (const s of subjects) {
        if (!subjectMap.has(s.lecturerId)) subjectMap.set(s.lecturerId, []);
        subjectMap.get(s.lecturerId).push({ id: s.id, subjectCode: s.subjectCode, subjectName: s.subjectName });
      }
    }

    if (userIds.length) {
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'mustChangePassword', 'isActive'],
      });
      for (const u of users) {
        userMap.set(u.id, { mustChangePassword: u.mustChangePassword, isActive: u.isActive });
      }
    }

    const data = rows.map((l) => {
      const userStatus = l.userId ? userMap.get(l.userId) : null;
      return {
        ...l.get(),
        subjects: subjectMap.get(l.id) || [],
        hasAccount: !!l.userId,
        mustChangePassword: userStatus ? userStatus.mustChangePassword : false,
        accountActive: userStatus ? userStatus.isActive : false,
      };
    });

    res.json({
      success: true,
      data,
      pagination: { total: count, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(count / parseInt(limit, 10)) },
    });
  } catch (error) {
    next(error);
  }
};

exports.createLecturer = async (req, res, next) => {
  try {
    const { name, email, contact, password, subjectIds, deliveryChannels } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    let user = null;
    let delivery = null;
    if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists' });
      }
      const userPassword = password || 'teacher@123';
      user = await User.create({
        email,
        password: userPassword,
        role: 'TEACHER',
        isActive: true,
        mustChangePassword: true,
        phone: contact || null,
      });

      const { channels } = validateChannels(deliveryChannels);
      if (channels.length) {
        const result = await credentialDeliveryService.deliverCredentials({
          user,
          name,
          tempPassword: userPassword,
          channels,
        });
        delivery = result.delivery;
      }
    }

    const lecturer = await Lecturer.create({
      name,
      email,
      contact,
      userId: user ? user.id : null,
    });

    if (Array.isArray(subjectIds) && subjectIds.length) {
      await Subject.update(
        { lecturerId: lecturer.id },
        { where: { id: { [Op.in]: subjectIds } } }
      );
    }

    const subjects = await Subject.findAll({
      where: { lecturerId: lecturer.id },
      attributes: ['id', 'subjectCode', 'subjectName'],
    });

    res.status(201).json({
      success: true,
      data: { ...lecturer.get(), subjects, hasAccount: !!user, mustChangePassword: user ? true : false, delivery },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateLecturer = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findByPk(req.params.id);
    if (!lecturer) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' });
    }

    const { name, email, contact, password, subjectIds } = req.body;

    if (email && email !== lecturer.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== lecturer.userId) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists' });
      }
    }

    if (lecturer.userId) {
      const user = await User.findByPk(lecturer.userId);
      if (user) {
        const userUpdates = {};
        if (email !== undefined && email !== user.email) userUpdates.email = email;
        if (contact !== undefined) userUpdates.phone = contact || null;
        if (password) {
          if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
          }
          userUpdates.password = password;
          userUpdates.mustChangePassword = true;
        }
        if (Object.keys(userUpdates).length) {
          await user.update(userUpdates);
        }
      }
    } else if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists' });
      }
      const userPassword = password || 'teacher@123';
      const user = await User.create({
        email,
        password: userPassword,
        role: 'TEACHER',
        isActive: true,
        mustChangePassword: true,
        phone: contact || null,
      });
      await lecturer.update({ userId: user.id });
    }

    await lecturer.update({ name, email, contact });

    if (Array.isArray(subjectIds)) {
      await Subject.update(
        { lecturerId: null },
        { where: { lecturerId: lecturer.id } }
      );
      if (subjectIds.length) {
        await Subject.update(
          { lecturerId: lecturer.id },
          { where: { id: { [Op.in]: subjectIds } } }
        );
      }
    }

    const subjects = await Subject.findAll({
      where: { lecturerId: lecturer.id },
      attributes: ['id', 'subjectCode', 'subjectName'],
    });

    const updatedLecturer = await Lecturer.findByPk(lecturer.id);
    const userStatus = updatedLecturer.userId ? await User.findByPk(updatedLecturer.userId, { attributes: ['mustChangePassword', 'isActive'] }) : null;
    res.json({
      success: true,
      data: {
        ...updatedLecturer.get(),
        subjects,
        hasAccount: !!updatedLecturer.userId,
        mustChangePassword: userStatus ? userStatus.mustChangePassword : false,
        accountActive: userStatus ? userStatus.isActive : false,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.resendLecturerCredentials = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findByPk(req.params.id);
    if (!lecturer) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' });
    }
    if (!lecturer.userId) {
      return res.status(400).json({ success: false, message: 'This lecturer has no teacher account' });
    }
    const user = await User.findByPk(lecturer.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Teacher account not found' });
    }
    if (!user.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot send credentials to a deactivated account' });
    }

    const { channels, error: channelError } = validateChannels(req.body.deliveryChannels ?? req.body.channels);
    if (channelError) {
      return res.status(400).json({ success: false, message: channelError });
    }
    if (!channels.length) {
      return res.status(400).json({ success: false, message: 'Select at least one delivery channel (email/sms)' });
    }

    const { newTempPassword } = req.body;
    if (newTempPassword !== undefined) {
      if (!newTempPassword || newTempPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New temporary password must be at least 6 characters' });
      }
      await user.update({ password: newTempPassword, mustChangePassword: true });
    }

    const { delivery } = await credentialDeliveryService.deliverCredentials({
      user,
      name: lecturer.name,
      tempPassword: newTempPassword || null,
      channels,
    });

    res.json({ success: true, message: 'Credentials sent', data: { delivery } });
  } catch (error) {
    next(error);
  }
};

exports.deleteLecturer = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findByPk(req.params.id);
    if (!lecturer) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' });
    }

    const subjectCount = await Subject.count({ where: { lecturerId: lecturer.id } });
    if (subjectCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Unlink subjects from "${lecturer.name}" first`,
      });
    }

    await lecturer.destroy();
    res.json({ success: true, message: 'Lecturer deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll({
      attributes: ['id', 'subjectCode', 'subjectName'],
      order: [['subjectCode', 'ASC']],
    });
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};
