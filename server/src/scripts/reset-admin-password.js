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

export async function resetAdminPassword(cliArgs = {}) {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    console.log('====================================================');
    console.log('🔑 ChargeShare India - Reset Admin Password CLI');
    console.log('====================================================\n');

    let email = cliArgs.email;
    let newPassword = cliArgs.password;

    if (!email) {
      email = await prompt('Enter Administrator Email: ');
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) {
      console.error('❌ Error: Administrator email is required.');
      process.exit(1);
    }

    const user = await User.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
    if (!user) {
      console.error(`❌ Error: No account found with email "${cleanEmail}".`);
      process.exit(1);
    }

    if (user.role !== 'ADMIN') {
      console.error(`❌ Error: Account with email "${cleanEmail}" does not have the ADMIN role.`);
      process.exit(1);
    }

    if (!newPassword) {
      newPassword = await prompt('Enter New Strong Password (min 12 chars with upper, lower, digit, symbol): ', true);
    }

    if (!newPassword || newPassword.length < 12 || !passwordComplexity.test(newPassword)) {
      console.error(
        '❌ Error: Password does not meet security requirements.\nMust be >= 12 chars and contain uppercase, lowercase, numbers, and special characters.'
      );
      process.exit(1);
    }

    user.password = newPassword;
    user.mustChangePassword = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: 'CLI_SYSTEM',
      actorRole: 'SYSTEM',
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id.toString(),
      targetIdentifier: user.email,
      reason: 'Administrator password reset via CLI tool (reset-admin-password)',
      metadata: { method: 'CLI' },
    });

    console.log('\n✅ Administrator password reset successfully!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔒 Status: mustChangePassword flag activated (forced change on next login)`);
    console.log(`⚡ Session Security: All previous sessions revoked (tokenVersion incremented)`);
    console.log('====================================================\n');

    return user;
  } catch (err) {
    console.error('❌ Failed to reset administrator password:', err.message);
    process.exit(1);
  }
}

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('reset-admin-password.js')) {
  const args = {};
  const rawArgs = process.argv.slice(2);
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--email' && rawArgs[i + 1]) {
      args.email = rawArgs[++i];
    } else if (arg.startsWith('--email=')) {
      args.email = arg.split('=')[1];
    } else if (arg === '--password' && rawArgs[i + 1]) {
      args.password = rawArgs[++i];
    } else if (arg.startsWith('--password=')) {
      args.password = arg.split('=')[1];
    }
  }

  resetAdminPassword(args).then(() => {
    process.exit(0);
  });
}
