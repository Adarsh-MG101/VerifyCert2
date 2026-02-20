require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');

/**
 * Migration Script: Multi-Tenancy Fix
 * ----------------------------------
 * 1. Identifies users with 'user' role but no organization.
 * 2. Creates a 'Default Organization' for them if it doesn't exist.
 * 3. Assigns these users to the organization as members.
 */

async function migrate() {
    try {
        console.log('🚀 Starting Multi-Tenancy Migration...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Find users without organization
        const orphanedUsers = await User.find({
            role: 'user',
            organization: { $exists: false }
        });

        if (orphanedUsers.length === 0) {
            console.log('ℹ️ No orphaned users found. Database is clean.');
        } else {
            console.log(`🔍 Found ${orphanedUsers.length} orphaned users.`);

            // 2. Ensure a default organization exists
            let defaultOrg = await Organization.findOne({ slug: 'default-org' });

            if (!defaultOrg) {
                console.log('🔨 Creating "Default Organization"...');
                // Use the first orphaned user as a placeholder owner
                defaultOrg = new Organization({
                    name: 'Default Organization',
                    slug: 'default-org',
                    owner: orphanedUsers[0]._id
                });
                await defaultOrg.save();
                console.log('✅ Default Organization created.');
            }

            // 3. Update users
            const updateCount = await User.updateMany(
                { role: 'user', organization: { $exists: false } },
                { $set: { organization: defaultOrg._id, orgRole: 'member' } }
            );

            console.log(`✅ Successfully migrated ${updateCount.modifiedCount} users to the Default Organization.`);
        }

        // 4. Final check for Templates
        const Template = require('./models/Template');
        const orphanedTemplates = await Template.find({ organization: { $exists: false } });

        if (orphanedTemplates.length > 0) {
            console.log(`🔍 Found ${orphanedTemplates.length} orphaned templates. Aligning with Default Org...`);
            let defaultOrg = await Organization.findOne({ slug: 'default-org' });
            if (defaultOrg) {
                await Template.updateMany(
                    { organization: { $exists: false } },
                    { $set: { organization: defaultOrg._id } }
                );
                console.log('✅ Templates migrated.');
            }
        }

        console.log('🎉 Migration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
