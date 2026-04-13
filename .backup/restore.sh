#!/bin/bash
# 恢复滚动条改进版本的脚本

BACKUP_DIR=".backup/scrollbar-improvement-20260414-013555"

if [ -d "$BACKUP_DIR" ]; then
    echo "恢复滚动条改进版本..."
    cp -v "$BACKUP_DIR/globals.css" src/renderer/styles/globals.css
    cp -v "$BACKUP_DIR/V0DataSourcesPage.tsx" src/renderer/pages/V0DataSourcesPage.tsx
    cp -v "$BACKUP_DIR/PageLayout.tsx" src/renderer/components/v0-layout/PageLayout.tsx
    cp -v "$BACKUP_DIR/page-layout.tsx" src/renderer/components/dashboard/page-layout.tsx
    cp -v "$BACKUP_DIR/index.tsx" src/renderer/components/dashboard/index.tsx
    echo "恢复完成！"
else
    echo "备份目录不存在: $BACKUP_DIR"
    exit 1
fi
