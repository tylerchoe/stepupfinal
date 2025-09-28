#!/usr/bin/env python3
"""
Quick script to create some test boss data for testing the boss battle system
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, '/Users/tylerchoe/Downloads/JesusLovesYou/backend')

from models import db, Boss, BossManager
from app import app

def create_test_bosses():
    with app.app_context():
        # Clear existing bosses for clean testing
        Boss.query.delete()
        
        # Create some test bosses
        test_bosses = [
            Boss(
                name="Shadow Wolf",
                description="A mysterious creature that feeds on inactivity. Defeat it with your daily steps!",
                max_health=10000,
                current_health=10000,
                exp_reward=500,
                coin_reward=100,
                difficulty="Easy",
                boss_type="Daily",
                is_active=True
            ),
            Boss(
                name="Couch Demon",
                description="This lazy demon wants you to stay seated all day. Show it who's boss!",
                max_health=15000,
                current_health=15000,
                exp_reward=750,
                coin_reward=150,
                difficulty="Medium",
                boss_type="Global",
                is_active=True
            ),
            Boss(
                name="The Procrastination Beast",
                description="It grows stronger the longer you wait. Attack now before it's too late!",
                max_health=25000,
                current_health=25000,
                exp_reward=1200,
                coin_reward=250,
                special_reward="Legendary Badge",
                difficulty="Hard",
                boss_type="Global",
                is_active=True
            ),
            Boss(
                name="The Bald Miner",
                description="A grizzled underground digger who's spent so long tunneling that he's tougher than stone itself. His shiny bald head gleams in the torchlight—a reminder that this miner doesn't quit digging until the fight is over.",
                max_health=1000000,
                current_health=1000000,
                exp_reward=10000,
                coin_reward=5000,
                special_reward="Legendary Pickaxe",
                difficulty="Legendary",
                boss_type="Global",
                is_active=True
            )
        ]
        
        for boss in test_bosses:
            db.session.add(boss)
        
        db.session.commit()
        print(f"✅ Created {len(test_bosses)} test bosses!")
        
        # List created bosses
        print("\nCreated bosses:")
        for boss in Boss.query.all():
            print(f"- {boss.name} ({boss.difficulty}) - {boss.current_health:,}/{boss.max_health:,} HP - {boss.boss_type}")

if __name__ == '__main__':
    create_test_bosses()