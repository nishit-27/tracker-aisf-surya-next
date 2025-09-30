#!/usr/bin/env node

// Test script to debug the insane_websites_0 account issue
import { resolveInstagramUserId, fetchInstagramData, isInstagramConfigured } from './lib/platforms/instagram.js';

const RAPIDAPI_KEY = "966b1d7401mshda14440aa93b49ap111085jsn0bcf31f7c222";
const RAPIDAPI_HOST_INSTAGRAM = "instagram-looter2.p.rapidapi.com";

// Set environment variables
process.env.RAPIDAPI_KEY = RAPIDAPI_KEY;
process.env.RAPIDAPI_HOST_INSTAGRAM = RAPIDAPI_HOST_INSTAGRAM;

async function testInsaneWebsites() {
  console.log('🔍 Testing insane_websites_0 account...\n');
  
  const username = 'insane_websites_0';
  
  try {
    console.log('1. Testing user ID resolution...');
    const userId = await resolveInstagramUserId(username, { 
      useMockOnError: false, 
      logResponse: true 
    });
    console.log(`   ✅ User ID: ${userId}\n`);
    
    console.log('2. Testing data fetching...');
    const instagramData = await fetchInstagramData({
      username,
      userId,
      pageSize: 12,
      maxPages: 1,
      useMockOnError: false
    });
    
    console.log(`   ✅ Account ID: ${instagramData.account.accountId}`);
    console.log(`   ✅ Username: ${instagramData.account.username}`);
    console.log(`   ✅ Display Name: ${instagramData.account.displayName}`);
    console.log(`   ✅ Media Items Count: ${instagramData.media.length}\n`);
    
    console.log('🎉 All tests passed! The account should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testInsaneWebsites().catch(console.error);
