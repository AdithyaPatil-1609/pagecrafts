import { readDeployCredential } from '@/lib/deploy/credentials';

const c = readDeployCredential();
console.log('length      :', c.length);
console.log('starts with :', c.slice(0, 11));
console.log('whitespace  :', /\s/.test(c));