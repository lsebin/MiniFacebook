package storage;

public class News {
		public String category;
		public String headline;
		public String authors;
		public String link;
		public String short_description;
		public String date;

		public News(String c, String h, String a, String l, String sd, String d) {
			this.category = c;
			this.headline = h;
			this.authors = a;
			this.link = l;
			this.short_description = sd;
			this.date = d;
		}
		
	}