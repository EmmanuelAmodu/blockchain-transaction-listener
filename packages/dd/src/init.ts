import tracer from 'dd-trace';

tracer.init();

const blocklist = [/\/(v\d+\/)?health\/?$/];

tracer.use('express', { blocklist });
tracer.use('fastify', { blocklist });
