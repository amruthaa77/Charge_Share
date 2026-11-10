import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { connectDB } from '../config/db.js';

const passwordComplexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

function prompt(question, isSecret = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (!isSecret) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    } else {
      // In node, masking password output
      process.stdout.write(question);
      let input = '';
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char) => {
        char = char + '';
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            process.stdin.setRawMode?.(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            rl.close();
            resolve(input.trim());
            break;
          case '\u0003':
            process.exit(1);
            break;
          case '\u0008':
          case '\x7f':
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            input += char;
            process.stdout.write('*');
            break;
        }
      };

      process.stdin.on('data', onData);
    }
  });
}

export async function createAdmin(cliArgs = {}) {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    console.log('====================================================');
    console.log('🛡️  ChargeShare India - Create Administrator Console');
    console.log('====================================================\n');

    let name = cliArgs.name;
    let email = cliArgs.email;
    let password = cliArgs.password;

    if (!name) {
      name = await prompt('Enter Administrator Name: ');
    }
    if (!name || name.length < 2) {
      console.error('❌ Error: Administrator name must be at least 2 characters.');
      process.exit(1);
    }

    if (!email) {
      email = await prompt('Enter Administrator Email: ');
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
      console.error('❌ Error: Please provide a valid email address.');
      process.exit(1);
    }
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      console.error(`❌ Error: An account with email "${cleanEmail}" already exists.`);
      process.exit(1);
    }

    if (!password) {
      password = await prompt('Enter Strong Password (12+ chars with upper, lower, digit, symbol): ', true);
    }

    if (!passwordComplexity.test(password)) {
      console.error(
        '❌ Error: Password does not meet security requirements.\nMust be >= 12 chars and contain uppercase, lowercase, numbers, and special characters.'
      );
      process.exit(1);
    }

    const admin = await User.create({
      name,
      email: cleanEmail,
      password,
      phone: '+919999900099',
      role: 'ADMIN',
      city: 'Bengaluru',
      mustChangePassword: true,
      trustStatus: 'VERIFIED',
      emailVerified: true,
      phoneVerified: true,
    });

    await AuditLog.create({
      actorId: admin._id,
      actorEmail: admin.email,
      actorRole: 'ADMIN',
      action: 'ADMIN_CREATE',
      targetType: 'User',
      targetId: admin._id.toString(),
      targetIdentifier: admin.email,
      reason: 'Administrator provisioned via CLI tool (create-admin)',
      metadata: { method: 'CLI' },
    });

    console.log('\n✅ Administrator successfully created!');
    console.log(`👤 Name: ${admin.name}`);
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔒 Role: ${admin.role}`);
    console.log(`⚡ Forced Password Rotation: ENABLED (User must change password upon first login)`);
    console.log('====================================================\n');

    return admin;
  } catch (err) {
    console.error('❌ Failed to create administrator:', err.message);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('create-admin.js')) {
  // Parse command line arguments if passed (e.g. --name=... --email=... --password=...)
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--name=')) args.name = arg.split('=')[1];
    if (arg.startsWith('--email=')) args.email = arg.split('=')[1];
    if (arg.startsWith('--password=')) args.password = arg.split('=')[1];
  });

  createAdmin(args).then(() => {
    process.exit(0);
  });
}
