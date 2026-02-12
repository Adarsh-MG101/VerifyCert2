#!/bin/bash
# Patch OnlyOffice to allow private IPs
CONFIG_FILE="/etc/onlyoffice/documentserver/default.json"

echo "Current blockPrivateIP status:"
grep "blockPrivateIP" $CONFIG_FILE

sed -i 's/"blockPrivateIP": true/"blockPrivateIP": false/g' $CONFIG_FILE
sed -i 's/"allowPrivateIPAddress": false/"allowPrivateIPAddress": true/g' $CONFIG_FILE

echo "New blockPrivateIP status:"
grep "blockPrivateIP" $CONFIG_FILE

# Restart services
supervisorctl restart all
echo "Services restarted."
