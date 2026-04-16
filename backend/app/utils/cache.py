import redis
from flask import current_app

class CacheManager:
    _client = None

    @property
    def client(self):
        if self._client is None:
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                try:
                    self._client = redis.from_url(redis_url, decode_responses=True)
                except Exception as e:
                    current_app.logger.error(f"Failed to connect to Redis: {e}")
            else:
                current_app.logger.warning("REDIS_URL not configured")
        return self._client

    def delete(self, key):
        if self.client:
            try:
                self.client.delete(key)
                return True
            except Exception as e:
                current_app.logger.error(f"Redis delete failed: {e}")
        return False

cache_manager = CacheManager()
