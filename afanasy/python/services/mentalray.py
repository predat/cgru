# -*- coding: utf-8 -*-
from services import service

parser = 'mentalray'

str_hosts = '@AF_HOSTS@'
str_hostsprefix = '-hosts '
str_hostseparator = ' '


class mentalray(service.service):
	"""Mental Ray Standalone
	"""

	# override base service class method

	def __init__(self, taskInfo):
		print('mentalray.init')
		return service.service.__init__(self, taskInfo)  # TODO: returning something from __init__ is strange

	def applycmdhosts(self, command):
		"""Missing DocString

		:param command:
		:return:
		"""
		hosts = str_hostseparator.join(self.hosts)
		command = command.replace(
			self.str_hosts,
			str_hostsprefix + hosts + ' -- '
		)
		print('Mentalray hosts list "%s" applied:' % hosts)
		print(command)
		return command
