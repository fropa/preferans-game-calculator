FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Static files
COPY public /usr/share/nginx/html

EXPOSE 80

