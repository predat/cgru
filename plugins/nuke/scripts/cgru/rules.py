# -*- coding: utf-8 -*-
import os

import cgruconfig
import cgruutils

import nuke


def rulesOpenShot():
	path = nuke.root().name()
	print('Scene = ' + path)

	print('Scenes:')
	print(cgruconfig.VARS['rules_scenes'])
	for scn in cgruconfig.VARS['rules_scenes']:
		path = path.split(scn)[0]
	print('Shot = %s' % path)

	print('Projects:')
	print(cgruconfig.VARS['rules_projects'])
	for prj in cgruconfig.VARS['rules_projects']:
		path = path.replace(prj, '')
	print('Path = %s' % path)

	path = cgruconfig.VARS['rules_url'] + path
	print('URL = %s' % path)

	cgruutils.webbrowse(path)

