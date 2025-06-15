import Conversation from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { getReceiverSocketId, getIo } from '../socket/socket.js';

export const senMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { text: message } = req.body; // Make sure this matches frontend field name

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    // Create message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
    });

    // Add message to conversation
    conversation.messages.push(newMessage._id);

    // Save both in parallel
    await Promise.all([
      conversation.save(),
      newMessage.save(),
    ]);

    // Real-time emit using socket.io
    const receiverSocketId = getReceiverSocketId(receiverId);
    const io = getIo();

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', newMessage);
    }

    return res.status(201).json({
      success: true,
      newMessage,
    });

  } catch (error) {
    console.error("Send Message Error:", error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate('messages'); // Optional: populate full message docs

    if (!conversation) {
      return res.status(200).json({
        success: true,
        messages: [],
      });
    }

    return res.status(200).json({
      success: true,
      messages: conversation.messages,
    });

  } catch (error) {
    console.error("Get Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
};
