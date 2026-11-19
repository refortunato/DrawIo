# draw.io com plugins e bibliotecas de componentes próprios.
# Contexto de build: a pasta Template (veja docker-compose.yml).
FROM jgraph/drawio:latest

USER root
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends jq \
 && rm -rf /var/lib/apt/lists/* \
 && cp "$CATALINA_HOME/webapps/draw/js/PostConfig.js" "$CATALINA_HOME/webapps/draw/js/PostConfig.base.js"

COPY drawio/start.sh /opt/drawio-custom/start.sh
COPY drawio/config.json /opt/drawio-custom/config.json
COPY drawio/libraries/ /opt/drawio-custom/libraries/
COPY plugins/ /opt/drawio-custom/plugins/

RUN chmod 755 /opt/drawio-custom/start.sh \
 && chown -R ${RUN_USER}:0 "$CATALINA_HOME/webapps/draw/js" "$CATALINA_HOME/webapps/draw/plugins" \
 && chmod -R g=u "$CATALINA_HOME/webapps/draw/js" "$CATALINA_HOME/webapps/draw/plugins"

USER ${RUN_USER}

ENTRYPOINT ["/opt/drawio-custom/start.sh"]
CMD ["catalina.sh", "run"]
