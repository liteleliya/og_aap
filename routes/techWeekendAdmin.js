const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../supabaseAdmin');
const { Parser } = require('json2csv');
const isAdmin = require('../middleware/isAdmin');

// Redirect /admin/techweekend → /admin/techweekend/dashboard
router.get('/', isAdmin, (req, res) => {
  res.redirect('/admin/techweekend/dashboard');
});

// Admin dashboard (grouped by user)
router.get('/dashboard', isAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tw_registrations')
    .select(`
      user_id,
      tw_users: user_id (email, display_name),
      tw_events: event_id (id, name)
    `);

  if (error) {
    console.error('Error fetching TechWeekend dashboard data:', error);
    return res.status(500).send('Error loading admin dashboard');
  }

  // Group registrations by user
  const grouped = {};
  data.forEach(r => {
    const email = r.tw_users?.email;
    const name = r.tw_users?.display_name;
    const event = { id: r.tw_events?.id, name: r.tw_events?.name };

    if (!grouped[email]) {
      grouped[email] = { email, display_name: name, events: [event] };
    } else {
      grouped[email].events.push(event);
    }
  });

  const groupedData = Object.values(grouped).map(u => ({
    email: u.email,
    display_name: u.display_name,
    events_registered: u.events.map(e => e.name).join(', '),
    total_events: u.events.length,
    event_ids: u.events.map(e => e.id)
  }));

  const { data: events, error: eventError } = await supabaseAdmin
    .from('tw_events')
    .select('id, name');

  if (eventError) {
    console.error('Error fetching events:', eventError);
    return res.status(500).send('Error loading events');
  }

  res.render('techweekend_admin_dashboard', { registrations: groupedData, events });
});

// Download all registrations (grouped by user) as CSV
router.get('/registrations/download', isAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tw_registrations')
    .select(`
      user_id,
      tw_users: user_id (email, display_name),
      tw_events: event_id (name)
    `);

  if (error) {
    console.error('Error downloading TechWeekend registrations:', error);
    return res.status(500).send('Download failed');
  }

  const grouped = {};
  data.forEach(r => {
    const email = r.tw_users?.email;
    const name = r.tw_users?.display_name;
    const event = r.tw_events?.name;

    if (!grouped[email]) {
      grouped[email] = { email, display_name: name, events: [event] };
    } else {
      grouped[email].events.push(event);
    }
  });

  const flatData = Object.values(grouped).map(u => ({
    email: u.email,
    display_name: u.display_name,
    events_registered: u.events.join(', '),
    total_events: u.events.length
  }));

  const parser = new Parser();
  const csv = parser.parse(flatData);

  res.header('Content-Type', 'text/csv');
  res.attachment('techweekend_registrations_grouped.csv');
  res.send(csv);
});

// Download registrations for a specific event
router.get('/registrations/:eventId/download', isAdmin, async (req, res) => {
  const { eventId } = req.params;

  const { data, error } = await supabaseAdmin
    .from('tw_registrations')
    .select(`
      user_id,
      tw_users: user_id (email, display_name)
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error downloading event registrations:', error);
    return res.status(500).send('Download failed');
  }

  if (!data || data.length === 0) {
    return res.status(404).send('No registrations found for this event');
  }

  const flatData = data.map(r => ({
    email: r.tw_users?.email,
    display_name: r.tw_users?.display_name
  }));

  const parser = new Parser();
  const csv = parser.parse(flatData);

  res.header('Content-Type', 'text/csv');
  res.attachment(`techweekend_registrations_${eventId}.csv`);
  res.send(csv);
});

module.exports = router;
