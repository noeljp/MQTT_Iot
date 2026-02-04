"""
Background tasks for APRU40 system
"""
from apscheduler.schedulers.background import BackgroundScheduler
from app.models.iot import SensorData
from datetime import datetime

scheduler = BackgroundScheduler()

def cleanup_old_sensor_data():
    """Clean up sensor data older than 7 days"""
    try:
        deleted = SensorData.cleanup_old_data(days=7)
        print(f"[{datetime.utcnow()}] Cleaned up {deleted} old sensor data records")
    except Exception as e:
        print(f"Error cleaning up sensor data: {e}")

def start_background_tasks():
    """Start all background tasks"""
    # Run cleanup daily at 2 AM
    scheduler.add_job(
        func=cleanup_old_sensor_data,
        trigger="cron",
        hour=2,
        minute=0,
        id='cleanup_sensor_data',
        name='Cleanup old sensor data',
        replace_existing=True
    )
    
    scheduler.start()
    print("✓ Background tasks started")

def stop_background_tasks():
    """Stop all background tasks"""
    if scheduler.running:
        scheduler.shutdown()
        print("Background tasks stopped")
