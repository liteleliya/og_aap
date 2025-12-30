const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../supabaseAdmin');  
const { Parser } = require('json2csv');          

router.get('/dashboard', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('course_registrations')
    .select(`
      user_id,
      users: user_id (email, display_name),
      cte_courses: course_id (id, name)
    `);

  if (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).send('Error loading admin dashboard');
  }

  const grouped = {};
  data.forEach(r => {
    const email = r.users?.email;
    const name = r.users?.display_name;
    const course = { id: r.cte_courses?.id, name: r.cte_courses?.name };

    if (!grouped[email]) {
      grouped[email] = {
        email,
        display_name: name,
        courses: [course]
      };
    } else {
      grouped[email].courses.push(course);
    }
  });

  const groupedData = Object.values(grouped).map(u => ({
    email: u.email,
    display_name: u.display_name,
    courses_registered: u.courses.map(c => c.name).join(', '),
    total_courses: u.courses.length,
    course_ids: u.courses.map(c => c.id)
  }));

  const { data: courses, error: courseError } = await supabaseAdmin
    .from('cte_courses')
    .select('id, name');

  if (courseError) {
    console.error('Error fetching courses:', courseError);
    return res.status(500).send('Error loading courses');
  }

  res.render('admin_dashboard', { registrations: groupedData, courses });
});

router.get('/registrations/download', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('course_registrations')
    .select(`
      user_id,
      users: user_id (email, display_name),
      cte_courses: course_id (name)
    `);

  if (error) {
    console.error('Error downloading registrations:', error);
    return res.status(500).send('Download failed');
  }

  const grouped = {};
  data.forEach(r => {
    const email = r.users?.email;
    const name = r.users?.display_name;
    const course = r.cte_courses?.name;

    if (!grouped[email]) {
      grouped[email] = {
        email,
        display_name: name,
        courses: [course]
      };
    } else {
      grouped[email].courses.push(course);
    }
  });

  const flatData = Object.values(grouped).map(u => ({
    email: u.email,
    display_name: u.display_name,
    courses_registered: u.courses.join(', '),
    total_courses: u.courses.length
  }));

  const parser = new Parser();
  const csv = parser.parse(flatData);

  res.header('Content-Type', 'text/csv');
  res.attachment('registrations_grouped.csv');
  res.send(csv);
});

router.get('/registrations/:courseId/download', async (req, res) => {
  const { courseId } = req.params;

  const { data, error } = await supabaseAdmin
    .from('course_registrations')
    .select(`
      user_id,
      users: user_id (email, display_name)
    `)
    .eq('course_id', courseId);

  if (error) {
    console.error('Error downloading course registrations:', error);
    return res.status(500).send('Download failed');
  }

  if (!data || data.length === 0) {
    return res.status(404).send('No registrations found for this course');
  }

  const flatData = data.map(r => ({
    email: r.users?.email,
    display_name: r.users?.display_name
  }));

  const parser = new Parser();
  const csv = parser.parse(flatData);

  res.header('Content-Type', 'text/csv');
  res.attachment(`registrations_${courseId}.csv`);
  res.send(csv);
});

module.exports = router;
