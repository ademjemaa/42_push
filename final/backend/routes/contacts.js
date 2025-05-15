const express = require('express');
const router = express.Router();
const contactService = require('../services/contactService');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Get all contacts for a user
router.get('/', auth, async (req, res) => {
  try {
    const contacts = await contactService.getAllContacts(req.user.userId);
    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(400).json({ message: error.message || 'Failed to get contacts' });
  }
});

// Get a contact by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await contactService.getContactById(req.user.userId, req.params.id);
    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(404).json({ message: error.message || 'Contact not found' });
  }
});

// Create a new contact
router.post('/', auth, async (req, res) => {
  try {
    const contact = await contactService.createContact(req.user.userId, req.body);
    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(400).json({ message: error.message || 'Failed to create contact' });
  }
});

// Update a contact
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedContact = await contactService.updateContact(req.user.userId, req.params.id, req.body);
    res.json(updatedContact);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(400).json({ message: error.message || 'Failed to update contact' });
  }
});

// Delete a contact
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await contactService.deleteContact(req.user.userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(400).json({ message: error.message || 'Failed to delete contact' });
  }
});

// Get contact avatar
router.get('/:id/avatar', auth, async (req, res) => {
  try {
    const contact = await contactService.getContactById(req.user.userId, req.params.id);
    
    if (!contact || !contact.avatar) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
    
    // Set content type and send the image
    res.contentType('image/jpeg');
    res.end(contact.avatar);
  } catch (error) {
    console.error('Get contact avatar error:', error);
    res.status(400).json({ message: error.message || 'Failed to get contact avatar' });
  }
});

module.exports = router; 